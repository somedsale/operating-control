// server/src/routes/auth.admin.js
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const AdminUser = require("../models/AdminUser");

const router = express.Router();
router.use(express.json());
router.use(cookieParser());

// --------- Config ----------
const JWT_SECRET = process.env.ADMIN_JWT_SECRET || "change-this-secret";
const COOKIE_NAME = "admintoken";
const isProd = process.env.NODE_ENV === "production";
const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: isProd ? "none" : "lax", // khác domain cần "none"
  secure: isProd,                    // khác domain cần true + HTTPS
  path: "/",
  maxAge: 7 * 24 * 3600 * 1000,     // 7 ngày
};

// --------- Helpers ----------
function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

function requireAdmin(req, res, next) {
  try {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) return res.status(401).json({ error: "Unauthorized" });
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ error: "Unauthorized" });
  }
}

async function ensureDefaultAdmin() {
  const username = process.env.ADMIN_DEFAULT_USER || "admin";
  const pass = process.env.ADMIN_DEFAULT_PASSWORD || "admin123";
  let u = await AdminUser.findOne({ username });
  if (!u) {
    const hash = await bcrypt.hash(pass, 10);
    await AdminUser.create({ username, passwordHash: hash });
    console.log("[admin] Seeded default admin:", username);
  }
}

// --------- Routes ----------
/** POST /api/auth/admin/login { username, password } */
router.post("/login", async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: "Missing credentials" });

  const u = await AdminUser.findOne({ username });
  if (!u) return res.status(401).json({ error: "Invalid username or password" });

  const ok = await bcrypt.compare(password, u.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid username or password" });

  const token = signToken({ uid: String(u._id), username: u.username });
  res.cookie(COOKIE_NAME, token, COOKIE_OPTS);
  res.json({ ok: true, username: u.username });
});

/** POST /api/auth/admin/logout */
router.post("/logout", (_req, res) => {
  res.clearCookie(COOKIE_NAME, { ...COOKIE_OPTS, maxAge: 0 });
  res.json({ ok: true });
});

/** GET /api/auth/admin/me */
router.get("/me", requireAdmin, (req, res) => {
  res.json({ username: req.admin.username });
});

/** POST /api/auth/admin/change-password { currentPassword, newPassword } */
router.post("/change-password", requireAdmin, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) return res.status(400).json({ error: "Missing fields" });

  const u = await AdminUser.findById(req.admin.uid);
  if (!u) return res.status(404).json({ error: "Not found" });

  const ok = await bcrypt.compare(currentPassword, u.passwordHash);
  if (!ok) return res.status(401).json({ error: "Current password is incorrect" });

  u.passwordHash = await bcrypt.hash(newPassword, 10);
  await u.save();
  res.json({ ok: true });
});

// --------- Exports ----------
module.exports = router;                     // dùng cho app.use("/api/auth/admin", router)
module.exports.requireAdmin = requireAdmin;  // dùng trong các route khác (license...)
module.exports.ensureDefaultAdmin = ensureDefaultAdmin;
