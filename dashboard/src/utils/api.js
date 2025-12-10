// src/utils/api.js

const API_BASE = process.env.REACT_APP_API_BASE || ""; // để trống dùng proxy /api

// ===== Helpers =====
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function isTransientError(err, res) {
  // fetch network error -> TypeError (thông thường)
  if (err && err.name === "AbortError") return true; // timeout coi như transient
  if (err && err instanceof TypeError) return true;  // network error
  const st = res?.status;
  return st === 502 || st === 503 || st === 504;     // gateway/temporary
}

function isIdempotent(method = "GET") {
  const m = method.toUpperCase();
  return m === "GET" || m === "HEAD" || m === "OPTIONS";
}

/**
 * fetch với timeout bằng AbortController
 */
async function fetchWithTimeout(url, options = {}, timeoutMs = 15_000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

/**
 * API chính: gọi JSON với retry nhẹ cho GET khi lỗi tạm thời
 * @param {string} path - ví dụ "/api/sensor/pressure"
 * @param {object} opts - fetch options: method, headers, body, ...
 * @param {object} ex   - { timeoutMs=15000, retries=2, retryDelayBase=500 }
 */
export async function apiJson(path, opts = {}, ex = {}) {
  const url = API_BASE + path;
  const { headers, body, ...rest } = opts;

  // ---- Short-circuit nếu trình duyệt đang offline
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    const err = new Error("Offline");
    err.code = "OFFLINE";
    throw err;
  }

  const timeoutMs = ex.timeoutMs ?? 15_000;
  const maxRetries = ex.retries ?? 2;            // chỉ áp dụng cho GET
  const backoffBase = ex.retryDelayBase ?? 500;  // ms

  const method = (rest.method || "GET").toUpperCase();

  let attempt = 0;
  // Vòng lặp retry cho GET/idempotent khi lỗi transient
  // Non-idempotent (POST/PUT/DELETE...) chỉ chạy 1 lần để tránh gửi lặp.
  const maxAttempt = isIdempotent(method) ? (maxRetries + 1) : 1;

  // Chuẩn bị request options chung
  const reqInitBase = {
    ...rest,
    method,
    credentials: "include", // luôn gửi cookie/session
    headers: {
      "Content-Type": "application/json",
      ...(headers || {}),
    },
    body:
      body == null
        ? undefined
        : typeof body === "string"
        ? body
        : JSON.stringify(body),
    cache: "no-store",
  };

  while (attempt < maxAttempt) {
    let res, parseErr;
    try {
      res = await fetchWithTimeout(url, reqInitBase, timeoutMs);

      // 204 No Content → return null
      if (res.status === 204) return null;

      let data = null;
      try {
        // có thể trả text/empty → bắt lỗi parse và để data = null
        data = await res.json();
      } catch (e) {
        parseErr = e;
        data = null;
      }

      if (!res.ok) {
        // Nếu là lỗi transient và còn lượt retry → đợi & thử lại
        if (isIdempotent(method) && isTransientError(null, res) && attempt < maxAttempt - 1) {
          attempt += 1;
          await sleep(backoffBase * attempt); // backoff tuyến tính nhẹ
          continue;
        }
        // Ném lỗi có message từ server nếu có
        const msg =
          (data && (data.error || data.message)) ||
          `HTTP ${res.status}`;
        const err = new Error(msg);
        err.status = res.status;
        throw err;
      }

      // OK
      return data;

    } catch (err) {
      // Timeout/Network → có thể retry nếu GET/idempotent
      if (isIdempotent(method) && isTransientError(err, null) && attempt < maxAttempt - 1) {
        attempt += 1;
        await sleep(backoffBase * attempt);
        continue;
      }
      // Hết retry hoặc không idempotent → ném lỗi
      // Nếu parse JSON fail nhưng res.ok, vẫn trả null để caller tự xử
      if (!res && parseErr && attempt >= maxAttempt - 1) {
        // hiếm gặp: ok nhưng JSON parse lỗi; trả null
        return null;
      }
      throw err;
    }
  }
  // về lý thuyết không tới đây
  throw new Error("Unexpected apiJson fallthrough");
}

/** Tiện ích: chuẩn hoá danh sách devices cho mọi định dạng BE */
export function normalizeDevices(resp) {
  if (Array.isArray(resp)) return resp;
  if (Array.isArray(resp?.devices)) return resp.devices;
  return [];
}
