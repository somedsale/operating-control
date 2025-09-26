/* Seed Medical Gas collection
 * Usage:
 *   node server/src/scripts/seed.gas.js
 *   node server/src/scripts/seed.gas.js --reset   // (tuỳ chọn) xoá dữ liệu cũ rồi seed lại
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const { connect } = require("../../config/database");             // <-- db.js của bạn
const { Gas } = require("../models/gas.model");             // <-- model đã tạo
// Nếu bạn đặt model ở "server/models/gas.model.js", đổi đường dẫn thành: ../../models/gas.model

const SEED_DATA = [
  { code: "O2",  name: "Oxygen",          status: 0 }, // 0 normal | 1 high | 2 low
  { code: "N2O", name: "Nitrous Oxide",   status: 0 },
  { code: "MA4", name: "Medical Air 4",   status: 0 },
  { code: "MA7", name: "Medical Air 7",   status: 0 },
  { code: "VA",  name: "Vacuum",          status: 0 }, // để 0 (normal) mặc định, tránh báo fault ngay
  { code: "CO2", name: "Carbon Dioxide",  status: 0 },
];

async function main() {
  const reset = process.argv.includes("--reset");

  await connect();

  if (reset) {
    // Xoá toàn bộ collection rồi seed lại
    try {
      await Gas.collection.drop();
      console.log("[seed] Dropped collection medical_gases");
    } catch (e) {
      if (e.codeName === "NamespaceNotFound") {
        console.log("[seed] Collection not found, will create new.");
      } else {
        console.error("[seed] Drop collection error:", e.message);
      }
    }
  }

  // Upsert từng bản ghi theo code
  const ops = SEED_DATA.map((doc) => ({
    updateOne: {
      filter: { code: doc.code },
      update: { $set: { ...doc, updatedAt: new Date() } },
      upsert: true,
    },
  }));

  const res = await Gas.bulkWrite(ops);
  console.log("[seed] Upserted:", JSON.stringify(res, null, 2));

  const final = await Gas.find({}).sort({ code: 1 }).lean();
  console.log("[seed] Current documents:");
  final.forEach((d) => console.log(`  - ${d.code}: status=${d.status}`));

  process.exit(0);
}

main().catch((err) => {
  console.error("[seed] Error:", err);
  process.exit(1);
});
