// src/features/status/statusSlice.js
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { getAllGas, getAllPower } from "../api/apiClient";

/* ===== Medical Gas ===== */
export const GAS_ORDER = ["O2", "N2O", "MA4", "MA7", "VA", "CO2"];

const isGasFault = (code, status012) => {
  const s = Number(status012);
  const gas = String(code || "").toUpperCase();
  if (gas === "VA") return s === 2; // VA: chỉ 2 là lỗi
  return s === 1 || s === 2;        // khí khác: 1 | 2 là lỗi
};

const normStatus012 = (v) => {
  const n = Number(v);
  return n === 1 ? 1 : n === 2 ? 2 : 0;
};

export function shapeGas(raw) {
  const by = {};
  (raw || []).forEach((it) => {
    const code = String(it?.code ?? it?.keyword ?? "").toUpperCase();
    if (!GAS_ORDER.includes(code)) return;
    const status = normStatus012(it?.status);
    by[code] = { code, status, fault: isGasFault(code, status) };
  });
  return GAS_ORDER.map((c) => by[c] ?? { code: c, status: 0, fault: false });
}

/* ===== Power ===== */
export const POWER_KEYS = ["ips"];
export function shapePower(raw) {
  const arr = Array.isArray(raw) ? raw : [];
  const byKey = Object.fromEntries(
    arr.map((it) => [String(it?.key || "").toLowerCase(), !!it?.status])
  );
  return POWER_KEYS.map((k) => ({ key: k, fault: !!byKey[k] }));
}

/* ===== Small API helper for relay (optional) ===== */
const API_BASE = process.env.REACT_APP_API_BASE || "";
async function apiJson(url, opts = {}) {
  const res = await fetch(API_BASE + url, {
    method: "GET",
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    cache: "no-store",
    ...opts,
  });
  const text = await res.text();
  try {
    const data = JSON.parse(text);
    if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
    return data;
  } catch {
    throw new Error(`API not JSON (${res.status}): ${url}`);
  }
}

/* ===== Thunks ===== */
export const fetchGas = createAsyncThunk("status/fetchGas", async () => {
  const res = await getAllGas();
  const arr = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
  return shapeGas(arr);
});

export const fetchPower = createAsyncThunk("status/fetchPower", async () => {
  const res = await getAllPower();
  const payload = Array.isArray(res?.data) ? res.data : res;
  return shapePower(payload);
});

/* (tuỳ chọn) nếu còn dùng relay thật sự, giữ các thunk bên dưới;
   không cần cho yêu cầu “tắt báo động 1 lần”, nhưng để nguyên cho tương thích */
const IPS_RELAY_ID = "ips_relay";
export const fetchRelay = createAsyncThunk("status/fetchRelay", async () => {
  const list = await apiJson("/api/devices"); // [{ deviceId, isOn, hwOn }]
  const arr = Array.isArray(list?.devices) ? list.devices : Array.isArray(list) ? list : [];
  const row = arr.find((d) => d?.deviceId === IPS_RELAY_ID);
  const on =
    typeof row?.hwOn === "boolean"
      ? row.hwOn
      : typeof row?.isOn === "boolean"
      ? row.isOn
      : false;
  return { ipsOn: !!on };
});

export const toggleRelay = createAsyncThunk(
  "status/toggleRelay",
  async (nextOn, { rejectWithValue }) => {
    try {
      await apiJson(`/api/devices/${IPS_RELAY_ID}/state`, {
        method: "PATCH",
        body: JSON.stringify({ on: !!nextOn }),
      });
      const list = await apiJson("/api/devices");
      const arr = Array.isArray(list?.devices) ? list.devices : Array.isArray(list) ? list : [];
      const row = arr.find((d) => d?.deviceId === IPS_RELAY_ID);
      const on =
        typeof row?.hwOn === "boolean"
          ? row.hwOn
          : typeof row?.isOn === "boolean"
          ? row.isOn
          : false;
      return { ipsOn: !!on };
    } catch (e) {
      return rejectWithValue(e.message || "Toggle relay failed");
    }
  }
);

/* ===== Incident / Dismiss logic for IPS ===== */
// Khởi tạo dismissedIncidentId từ localStorage
const initDismissed = () => {
  try {
    const v = localStorage.getItem("ipsDismissedIncidentId");
    return Number.isFinite(Number(v)) ? Number(v) : 0;
  } catch {
    return 0;
  }
};

const initialState = {
  gas: {
    items: shapeGas([]),
    loading: false,
    error: "",
    updatedAt: null,
  },
  power: {
    items: shapePower([]),
    loading: false,
    error: "",
    updatedAt: null,
  },
  relay: {
    ipsOn: false,
    loading: false,
    error: "",
    updatedAt: null,
  },
  incidents: {
    ipsIncidentId: 0,               // tăng khi trạng thái ips: normal -> fault
    ipsDismissedIncidentId: initDismissed(), // lưu “đã tắt cho đợt hiện tại”
  },
};

const statusSlice = createSlice({
  name: "status",
  initialState,
  reducers: {
    // Bấm nút “Tắt báo động IPS” -> đánh dấu dismissed cho ĐỢT hiện tại
    dismissIpsAlarmOnce(state) {
      state.incidents.ipsDismissedIncidentId = state.incidents.ipsIncidentId;
      try {
        localStorage.setItem(
          "ipsDismissedIncidentId",
          String(state.incidents.ipsDismissedIncidentId)
        );
      } catch {}
    },
  },
  extraReducers: (builder) => {
    /* --- GAS --- */
    builder
      .addCase(fetchGas.pending, (st) => {
        st.gas.loading = true;
        st.gas.error = "";
      })
      .addCase(fetchGas.fulfilled, (st, { payload }) => {
        st.gas.loading = false;
        st.gas.items = payload;
        st.gas.updatedAt = Date.now();
      })
      .addCase(fetchGas.rejected, (st, { error }) => {
        st.gas.loading = false;
        st.gas.error = error?.message || "fetchGas error";
      });

    /* --- POWER --- */
    builder
      .addCase(fetchPower.pending, (st) => {
        st.power.loading = true;
        st.power.error = "";
      })
      .addCase(fetchPower.fulfilled, (st, { payload }) => {
        // phát hiện biên (edge) normal -> fault cho IPS để tăng incidentId
        const prevIps = (st.power.items || []).find((x) => x.key === "ips");
        const prevFault = !!prevIps?.fault;

        st.power.loading = false;
        st.power.items = payload;
        st.power.updatedAt = Date.now();

        const nowIps = (payload || []).find((x) => x.key === "ips");
        const nowFault = !!nowIps?.fault;

        // Nếu vừa chuyển từ không lỗi -> lỗi: tăng incidentId
        if (!prevFault && nowFault) {
          st.incidents.ipsIncidentId += 1;
        }

        // Nếu HẾT lỗi (fault -> normal): không đổi incidentId,
        // nhưng lần sau lại lỗi, incidentId sẽ tăng (ở block trên).
        // Không cần reset dismissed tại đây; điều kiện hiển thị nút sẽ lo.
      })
      .addCase(fetchPower.rejected, (st, { error }) => {
        st.power.loading = false;
        st.power.error = error?.message || "fetchPower error";
      });

    /* --- RELAY (optional) --- */
    builder
      .addCase(fetchRelay.pending, (st) => {
        st.relay.loading = true;
        st.relay.error = "";
      })
      .addCase(fetchRelay.fulfilled, (st, { payload }) => {
        st.relay.loading = false;
        st.relay.ipsOn = !!payload.ipsOn;
        st.relay.updatedAt = Date.now();
      })
      .addCase(fetchRelay.rejected, (st, { error }) => {
        st.relay.loading = false;
        st.relay.error = error?.message || "fetchRelay error";
      });

    builder
      .addCase(toggleRelay.pending, (st) => {
        st.relay.loading = true;
        st.relay.error = "";
      })
      .addCase(toggleRelay.fulfilled, (st, { payload }) => {
        st.relay.loading = false;
        st.relay.ipsOn = !!payload.ipsOn;
        st.relay.updatedAt = Date.now();
      })
      .addCase(toggleRelay.rejected, (st, { payload, error }) => {
        st.relay.loading = false;
        st.relay.error = payload || error?.message || "toggleRelay error";
      });
  },
});

export default statusSlice.reducer;
export const { dismissIpsAlarmOnce } = statusSlice.actions;

/* ===== Selectors ===== */
export const selectGas = (s) => s.status.gas.items;
export const selectGasLoading = (s) => s.status.gas.loading;
export const selectGasError = (s) => s.status.gas.error;
export const selectGasUpdatedAt = (s) => s.status.gas.updatedAt;

export const selectPower = (s) => s.status.power.items;
export const selectPowerLoading = (s) => s.status.power.loading;
export const selectPowerError = (s) => s.status.power.error;
export const selectPowerUpdatedAt = (s) => s.status.power.updatedAt;

export const selectRelayOn = (s) => s.status.relay.ipsOn;
export const selectRelayLoading = (s) => s.status.relay.loading;
export const selectRelayError = (s) => s.status.relay.error;

// IPS incident / dismissed
export const selectIpsIncidentId = (s) => s.status.incidents.ipsIncidentId;
export const selectIpsDismissedIncidentId = (s) =>
  s.status.incidents.ipsDismissedIncidentId;

// Tiện: IPS đang lỗi?
export const selectIpsFault = (s) =>
  !!(s.status.power.items || []).find((x) => x.key === "ips")?.fault;
