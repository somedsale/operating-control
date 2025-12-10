// src/pages/Settings/index.jsx
import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
import { useTranslation } from "react-i18next";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Divider from "../../components/Divider";
import { resetSettings, replaceSettings } from "../../store/settingsSlice";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faKeyboard,
  faCheck,
  faDeleteLeft,
} from "@fortawesome/free-solid-svg-icons";
import NumericKeypad from "../../components/NumericKeypad"; // giống TimeView
/* ---------- Reusable UI ---------- */
const Card = ({ title, children }) => (
  <div className="bg-white/70 backdrop-blur rounded-2xl shadow-sm p-6">
    <div className="text-xl font-semibold text-slate-700 mb-4">{title}</div>
    {children}
  </div>
);
const Row = ({ label, children }) => (
  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 py-3 border-b last:border-0 border-slate-200">
    <div className="text-slate-600">{label}</div>
    <div className="min-w-[240px]">{children}</div>
  </div>
);

/* ---------- API helper ---------- */
const apiFetch = async (
  url,
  { method = "GET", body, headers } = {},
  base = ""
) => {
  const res = await fetch((base || "") + url, {
    method,
    headers: { "Content-Type": "application/json", ...(headers || {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok)
    throw new Error(data?.error || data?.message || `HTTP ${res.status}`);
  return data;
};

/* ---------- Helpers ---------- */
const normDevId = (row) =>
  String(row?.deviceId ?? row?.id ?? row?._id ?? "").trim();
/* ---------- Keypad styles (match TimeView) ---------- */
const keypadStyles = {
  kbdBtn:
    "text-[clamp(16px,3.2vw,22px)] font-semibold h-14 rounded-xl border border-gray-300 bg-white/70 hover:bg-white active:scale-[0.98]",
};
/* ---------- Numeric Keypad (RS Address - like TimeView) ---------- */


/* ================================================================== */
export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const settings = useSelector((s) => s.settings);
  const [draft, setDraft] = useState(settings);
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState("general"); // general | relays | analogs | rs485 | api
  // Keypad for RS485 address (like TimeView)
  const [addrKpOpen, setAddrKpOpen] = useState(false);
  const openAddrKp = () => setAddrKpOpen(true);
  const closeAddrKp = () => setAddrKpOpen(false);
  const applyAddrKp = (n) => {
    const safe = Math.min(255, Math.max(1, Number(n) || 1));
    setRsForm((f) => ({ ...f, address: String(safe) }));
  };

  // Global messages (relays)
  const [msg, setMsg] = useState("");

  /* ---------- Relays state ---------- */
  const [apiDevices, setApiDevices] = useState([]); // [{id,name,relay}]
  const [devLoading, setDevLoading] = useState(false);
  const [devErr, setDevErr] = useState("");
  const [busy, setBusy] = useState(false); // relay actions busy

  /* ---------- AI modes state ---------- */
  const [aiItems, setAiItems] = useState(
    Array.from({ length: 4 }, (_, i) => ({ index: i + 1, mode: "AI" }))
  );
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMsg, setAiMsg] = useState("");
  const [aiErr, setAiErr] = useState("");

  /* ---------- RS485 state ---------- */
  const [rsCfg, setRsCfg] = useState({ address: 1, baud: 9600, parity: 0 });
  const [rsForm, setRsForm] = useState({
    address: "1",
    baud: "9600",
    parity: "0",
  });
  const [rsPhase, setRsPhase] = useState("idle"); // idle | loading | saving
  const [rsMsg, setRsMsg] = useState("");
  const [rsErr, setRsErr] = useState("");

  /* ---------- Flags (strict booleans) ---------- */
  const isBusy = !!busy;
  const isAiBusy = !!aiLoading;
  const isRsSaving = rsPhase === "saving";

  /* ---------- Consts ---------- */
  const PARITY_LABEL = { 0: "None", 1: "Odd", 2: "Even" };
  const BAUD_LIST = [1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200];

  /* ---------- One-time guards for tab init ---------- */
  const didInitMapRef = useRef(false);
  const didInitAiRef = useRef(false);
  const didInitRsRef = useRef(false);

  /* ---------- Basic effects ---------- */
  useEffect(() => setDraft(settings), [settings]);

  useEffect(() => {
    i18n.changeLanguage(draft.language || "en");
  }, [draft.language, i18n]);

  useEffect(() => {
    const root = document.documentElement;
    draft.theme === "dark"
      ? root.classList.add("dark")
      : root.classList.remove("dark");
  }, [draft.theme]);

  /* ---------- Draft handlers ---------- */
  const onChange = (key, value) => setDraft((d) => ({ ...d, [key]: value }));
  const onSave = () => {
    dispatch(replaceSettings(draft));
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };
  const onBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate(settings?.defaultRoute || "/lighting");
  };
  const onReset = () => {
    dispatch(resetSettings());
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const languages = useMemo(
    () => [
      { value: "en", label: "English" },
      { value: "vi", label: "Tiếng Việt" },
    ],
    []
  );

  /* ---------- API base ---------- */
  const apiBase = draft.apiBaseUrl || "http://localhost:5000";

  /* ==================== RELAYS ==================== */
  const fetchAllDevices = useCallback(async () => {
    setDevLoading(true);
    setDevErr("");
    try {
      const list = await apiFetch("/api/devices", {}, apiBase);
      const arr = (
        Array.isArray(list)
          ? list
          : Array.isArray(list?.devices)
          ? list.devices
          : Array.isArray(list?.data)
          ? list.data
          : []
      )
        .map((d) => {
          const key = normDevId(d);
          return key
            ? { id: key, name: d?.name || key, relay: Number(d?.relay || 0) }
            : null;
        })
        .filter(Boolean);

      arr.sort((a, b) => {
        const byName = String(a.name || "").localeCompare(
          String(b.name || ""),
          undefined,
          { sensitivity: "base" }
        );
        return byName !== 0 ? byName : String(a.id).localeCompare(String(b.id));
      });

      setApiDevices(arr);

      setDraft((prev) => {
        if (Array.isArray(prev.relayMap) && prev.relayMap.length) return prev;
        return {
          ...prev,
          relayMap: arr.map((r, idx) => ({ ...r, relay: idx + 1 })),
        };
      });
    } catch (e) {
      setDevErr(e.message || t("Failed to load devices"));
    } finally {
      setDevLoading(false);
    }
  }, [apiBase, t]);

  useEffect(() => {
    if (tab === "relays" && !didInitMapRef.current) {
      didInitMapRef.current = true;
      fetchAllDevices();
    }
  }, [tab, fetchAllDevices]);

  const relayTotal = Number(draft.relayTotal ?? 16);

  const seqRelayRows = useCallback(
    (total) => {
      const source = apiDevices.length
        ? apiDevices
        : [
            { id: "light_1", name: "Light 1" },
            { id: "light_2", name: "Light 2" },
            { id: "light_3", name: "Light 3" },
            { id: "light_4", name: "Light 4" },
            { id: "operating_lamp", name: "Operating Lamp" },
            { id: "xray", name: "X-Ray" },
            { id: "in_use", name: "In Use" },
            { id: "general_light", name: "General Light" },
            { id: "uv", name: "UV" },
            { id: "heat_lamp", name: "Heating Lamp" },
            { id: "ips_relay", name: "IPS" },
          ];
      return source.map((row, idx) => ({
        ...row,
        relay: idx < total ? idx + 1 : 0,
      }));
    },
    [apiDevices]
  );
// Hiển thị tên thiết bị theo i18n, fallback về row.name / row.id
const deviceLabel = (row) =>
  t(`device.${row.id}`, { defaultValue: row.name || row.id });

  const relayRows = useMemo(
    () =>
      Array.isArray(draft.relayMap) && draft.relayMap.length
        ? draft.relayMap
        : seqRelayRows(relayTotal),
    [draft.relayMap, relayTotal, seqRelayRows]
  );

  const viewRelayRows = useMemo(() => {
    const rows =
      Array.isArray(draft.relayMap) && draft.relayMap.length
        ? draft.relayMap
        : seqRelayRows(relayTotal);

    return rows
      .map((r, i) => ({ ...r, _i: i }))
      .sort((a, b) => {
        const ar = Number(a.relay || 0);
        const br = Number(b.relay || 0);
        if (ar === 0 && br > 0) return 1;
        if (br === 0 && ar > 0) return -1;
        if (ar !== br) return ar - br;

        const byName = String(a.name || "").localeCompare(
          String(b.name || ""),
          undefined,
          { sensitivity: "base" }
        );
        if (byName !== 0) return byName;
        return String(a.id).localeCompare(String(b.id));
      });
  }, [draft.relayMap, relayTotal, seqRelayRows]);

  const relayOptions = useMemo(
    () => [
      { value: 0, label: t("None") },
      ...Array.from({ length: relayTotal }, (_, i) => ({
        value: i + 1,
        label: `#${i + 1}`,
      })),
    ],
    [relayTotal, t]
  );

  const setRelayRow = (idx, patch) => {
    setDraft((d) => {
      const rows =
        Array.isArray(d.relayMap) && d.relayMap.length
          ? d.relayMap
          : seqRelayRows(relayTotal);
      const next = rows.map((r, i) => (i === idx ? { ...r, ...patch } : r));
      return { ...d, relayMap: next };
    });
  };

  const resetRelayMapByApiOrder = async () => {
    setBusy(true);
    setMsg("");
    try {
      let rows = apiDevices;
      if (!rows.length) {
        const list = await apiFetch("/api/devices", {}, apiBase);
        rows = (
          Array.isArray(list)
            ? list
            : Array.isArray(list?.devices)
            ? list.devices
            : Array.isArray(list?.data)
            ? list.data
            : []
        )
          .map((d) => {
            const key = normDevId(d);
            return key
              ? { id: key, name: d?.name || key, relay: Number(d?.relay || 0) }
              : null;
          })
          .filter(Boolean);
        setApiDevices(rows);
      }

      const sorted = [...rows].sort((a, b) => {
        const ar = Number(a.relay || 0);
        const br = Number(b.relay || 0);
        if (ar !== br) return ar - br;
        const byName = String(a.name || "").localeCompare(
          String(b.name || ""),
          undefined,
          { sensitivity: "base" }
        );
        if (byName !== 0) return byName;
        return String(a.id).localeCompare(String(b.id));
      });

      const renumbered = sorted.map((r, idx) => ({
        ...r,
        relay: idx < relayTotal ? idx + 1 : 0,
      }));

      setDraft((d) => ({ ...d, relayMap: renumbered }));
      setMsg(t("Mapping reset by API relay order"));
    } catch (e) {
      setMsg(e.message || t("Reset mapping failed"));
    } finally {
      setBusy(false);
      setTimeout(() => setMsg(""), 2000);
    }
  };

  const resetRelayMap = () =>
    setDraft((d) => ({
      ...d,
      relayMap: seqRelayRows(Number(d.relayTotal ?? 16)),
    }));

  const dupRelaySet = useMemo(() => {
    const used = relayRows.map((r) => r.relay).filter((n) => Number(n) > 0);
    const dups = new Set();
    used.forEach((n, _, arr) => {
      if (arr.filter((x) => x === n).length > 1) dups.add(n);
    });
    return dups;
  }, [relayRows]);

  const saveRelayMapping = async () => {
    setBusy(true);
    setMsg("");
    try {
      const payload = relayRows.map((r) => ({
        deviceId: r.id,
        relay: Number(r.relay || 0),
      }));
      await apiFetch(
        "/api/devices/mapping",
        { method: "PUT", body: { mapping: payload } },
        apiBase
      );
      setMsg(t("Mapping saved successfully"));
    } catch (e) {
      setMsg(e.message || t("Save mapping failed"));
    } finally {
      setBusy(false);
      setTimeout(() => setMsg(""), 2000);
    }
  };

  const loadRelayMapping = async () => {
    setBusy(true);
    setMsg("");
    try {
      const list = await apiFetch("/api/devices", {}, apiBase);
      const arr = Array.isArray(list)
        ? list
        : Array.isArray(list?.devices)
        ? list.devices
        : Array.isArray(list?.data)
        ? list.data
        : [];
      const byId = Object.fromEntries(
        arr
          .map((d) => [normDevId(d), Number(d?.relay || 0)])
          .filter(([k]) => !!k)
      );
      const source = apiDevices.length ? apiDevices : relayRows;
      const next = source.map((row) => ({ ...row, relay: byId[row.id] ?? 0 }));
      setDraft((d) => ({ ...d, relayMap: next }));
      setMsg(t("Loaded mapping from device"));
    } catch (e) {
      setMsg(e.message || t("Load mapping failed"));
    } finally {
      setBusy(false);
      setTimeout(() => setMsg(""), 2000);
    }
  };

  /* ==================== ANALOGS (AI Modes) ==================== */
  const fetchAiConfig = useCallback(async () => {
    setAiLoading(true);
    setAiErr("");
    try {
      const data = await apiFetch("/api/ai-config", {}, apiBase);
      const items = Array.isArray(data?.items) ? data.items : [];
      const rows = Array.from({ length: 4 }, (_, i) => {
        const idx = i + 1;
        const found = items.find((x) => Number(x.index) === idx);
        return { index: idx, mode: (found?.mode || "AI").toUpperCase() };
      });
      setAiItems(rows);
    } catch (e) {
      setAiErr(e.message || t("Failed to load AI config"));
    } finally {
      setAiLoading(false);
    }
  }, [apiBase, t]);

  useEffect(() => {
    if (tab === "analogs" && !didInitAiRef.current) {
      didInitAiRef.current = true;
      fetchAiConfig();
    }
  }, [tab, fetchAiConfig]);

  const setAiModeLocal = (index, mode) => {
    setAiItems((arr) =>
      arr.map((r) => (r.index === index ? { ...r, mode } : r))
    );
  };

  const saveAiMode = async (index) => {
    setAiLoading(true);
    setAiMsg("");
    try {
      const row = aiItems.find((r) => r.index === index);
      if (!row) return;
      await apiFetch(
        `/api/ai-config/${index}/mode`,
        { method: "PATCH", body: { mode: row.mode } },
        apiBase
      );
      setAiMsg(`${t("Saved")} AI${index} → ${row.mode}`);
    } catch (e) {
      setAiMsg(e.message || t("Save failed"));
    } finally {
      setAiLoading(false);
      setTimeout(() => setAiMsg(""), 1800);
    }
  };

  const saveAiModeAll = async () => {
    setAiLoading(true);
    setAiMsg("");
    try {
      for (const r of aiItems) {
        await apiFetch(
          `/api/ai-config/${r.index}/mode`,
          { method: "PATCH", body: { mode: r.mode } },
          apiBase
        );
      }
      setAiMsg(t("All channels saved"));
    } catch (e) {
      setAiMsg(e.message || t("Bulk save failed"));
    } finally {
      setAiLoading(false);
      setTimeout(() => setAiMsg(""), 1800);
    }
  };

  /* ==================== RS485 (new single API) ==================== */
  const fetchRs485 = useCallback(async () => {
    setRsPhase("loading");
    setRsErr("");
    try {
      const res = await apiFetch("/api/rs485", {}, apiBase); // { ok, data }
      const c = res?.data || {};
      const addr = Number(c.address ?? 1);
      const bd = Number(c.baud ?? 9600);
      const pr = Number(c.parity ?? 0);
      setRsCfg({ address: addr, baud: bd, parity: pr });
      setRsForm({
        address: String(addr),
        baud: String(bd),
        parity: String(pr),
      });
    } catch (e) {
      setRsCfg({ address: 1, baud: 9600, parity: 0 });
      setRsForm({ address: "1", baud: "9600", parity: "0" });
      setRsErr(e.message || t("Failed to load RS485 config"));
    } finally {
      setRsPhase("idle");
    }
  }, [apiBase, t]);

  // Watchdog: nếu lỡ kẹt state phía trên (rất hiếm), tự nhả sau 8s
  useEffect(() => {
    if (rsPhase !== "loading") return;
    const id = setTimeout(() => {
      setRsPhase("idle");
      setRsErr((prev) => prev || "RS485 request timeout");
    }, 8000);
    return () => clearTimeout(id);
  }, [rsPhase]);

  useEffect(() => {
    if (tab === "rs485" && !didInitRsRef.current) {
      didInitRsRef.current = true;
      fetchRs485();
    }
  }, [tab, fetchRs485]);

  const saveRsAddress = async () => {
    setRsPhase("saving");
    setRsMsg("");
    setRsErr("");
    try {
      const addr = parseInt(rsForm.address, 10);
      if (!Number.isInteger(addr) || addr < 1 || addr > 255)
        throw new Error(t("Address must be 1..255"));

      const body = {
        address: addr,
        baud: parseInt(rsForm.baud, 10) || rsCfg.baud,
        parity: parseInt(rsForm.parity, 10) || rsCfg.parity,
      };

      const res = await apiFetch(
        "/api/rs485",
        { method: "PUT", body },
        apiBase
      );
      const c = res?.data || body;

      setRsCfg({
        address: Number(c.address),
        baud: Number(c.baud),
        parity: Number(c.parity),
      });
      setRsForm({
        address: String(c.address),
        baud: String(c.baud),
        parity: String(c.parity),
      });
      setRsMsg(t("Address saved"));
    } catch (e) {
      setRsErr(e.message || t("Save address failed"));
    } finally {
      setRsPhase("idle");
      setTimeout(() => setRsMsg(""), 1500);
    }
  };

  const saveRsBaud = async () => {
    setRsPhase("saving");
    setRsMsg("");
    setRsErr("");
    try {
      const bd = parseInt(rsForm.baud, 10);
      if (!BAUD_LIST.includes(bd)) throw new Error(t("Unsupported baud"));

      const body = {
        address: parseInt(rsForm.address, 10) || rsCfg.address,
        baud: bd,
        parity: parseInt(rsForm.parity, 10) || rsCfg.parity,
      };

      const res = await apiFetch(
        "/api/rs485",
        { method: "PUT", body },
        apiBase
      );
      const c = res?.data || body;

      setRsCfg({
        address: Number(c.address),
        baud: Number(c.baud),
        parity: Number(c.parity),
      });
      setRsForm({
        address: String(c.address),
        baud: String(c.baud),
        parity: String(c.parity),
      });
      setRsMsg(t("Baud saved"));
    } catch (e) {
      setRsErr(e.message || t("Save baud failed"));
    } finally {
      setRsPhase("idle");
      setTimeout(() => setRsMsg(""), 1500);
    }
  };

  const saveRsParity = async () => {
    setRsPhase("saving");
    setRsMsg("");
    setRsErr("");
    try {
      const code = parseInt(rsForm.parity, 10);
      if (![0, 1, 2].includes(code)) throw new Error(t("Invalid parity"));

      const body = {
        address: parseInt(rsForm.address, 10) || rsCfg.address,
        baud: parseInt(rsForm.baud, 10) || rsCfg.baud,
        parity: code,
      };

      const res = await apiFetch(
        "/api/rs485",
        { method: "PUT", body },
        apiBase
      );
      const c = res?.data || body;

      setRsCfg({
        address: Number(c.address),
        baud: Number(c.baud),
        parity: Number(c.parity),
      });
      setRsForm({
        address: String(c.address),
        baud: String(c.baud),
        parity: String(c.parity),
      });
      setRsMsg(t("Parity saved"));
    } catch (e) {
      setRsErr(e.message || t("Save parity failed"));
    } finally {
      setRsPhase("idle");
      setTimeout(() => setRsMsg(""), 1500);
    }
  };

  const saveRsAll = async () => {
    setRsPhase("saving");
    setRsMsg("");
    setRsErr("");
    try {
      const addr = parseInt(rsForm.address, 10);
      const bd = parseInt(rsForm.baud, 10);
      const pr = parseInt(rsForm.parity, 10);

      if (!Number.isInteger(addr) || addr < 1 || addr > 255)
        throw new Error(t("Address must be 1..255"));
      if (!BAUD_LIST.includes(bd)) throw new Error(t("Unsupported baud rate"));
      if (![0, 1, 2].includes(pr)) throw new Error(t("Invalid parity"));

      const res = await apiFetch(
        "/api/rs485",
        { method: "PUT", body: { address: addr, baud: bd, parity: pr } },
        apiBase
      );
      const c = res?.data || { address: addr, baud: bd, parity: pr };

      setRsCfg({
        address: Number(c.address),
        baud: Number(c.baud),
        parity: Number(c.parity),
      });
      setRsForm({
        address: String(c.address),
        baud: String(c.baud),
        parity: String(c.parity),
      });
      setRsMsg(t("RS485 configuration saved"));
    } catch (e) {
      setRsErr(e.message || t("Save failed"));
    } finally {
      setRsPhase("idle");
      setTimeout(() => setRsMsg(""), 2000);
    }
  };
 /* ==================== [PIN] Security state ==================== */
  const [pinPhase, setPinPhase] = useState("idle"); // idle | saving | loading
  const [pinMsg, setPinMsg] = useState("");
  const [pinErr, setPinErr] = useState("");
  const [pinForm, setPinForm] = useState({
    oldPin: "",
    newPin1: "",
    newPin2: "",
  });

  // Keypad modals
  const [kpOldOpen, setKpOldOpen] = useState(false);
  const [kpNew1Open, setKpNew1Open] = useState(false);
  const [kpNew2Open, setKpNew2Open] = useState(false);

  const openKpOld = () => setKpOldOpen(true);
  const openKpNew1 = () => setKpNew1Open(true);
  const openKpNew2 = () => setKpNew2Open(true);
  const closeKpOld = () => setKpOldOpen(false);
  const closeKpNew1 = () => setKpNew1Open(false);
  const closeKpNew2 = () => setKpNew2Open(false);

  const applyKpOld = (n) => setPinForm((f) => ({ ...f, oldPin: String(n ?? "") }));
  const applyKpNew1 = (n) => setPinForm((f) => ({ ...f, newPin1: String(n ?? "") }));
  const applyKpNew2 = (n) => setPinForm((f) => ({ ...f, newPin2: String(n ?? "") }));

  const reloadPinInfo = async () => {
    setPinPhase("loading");
    setPinErr("");
    try {
      // Optional: backend trả { ok, hasPin, updatedAt }, có cũng tốt
      await apiFetch("/api/pin/config", {}, apiBase);
      setPinMsg("");
    } catch (e) {
      // không critical, chỉ hiển thị
      setPinErr(e.message || "Failed to load PIN info");
    } finally {
      setPinPhase("idle");
      setTimeout(() => setPinErr(""), 2000);
    }
  };

  const savePinChange = async () => {
    setPinPhase("saving");
    setPinMsg("");
    setPinErr("");

    try {
      const { oldPin, newPin1, newPin2 } = pinForm;
      if (!newPin1 || !newPin2) throw new Error("New PIN cannot be empty");
      if (newPin1 !== newPin2) throw new Error("New PIN confirmation does not match");
      if (String(newPin1).length > 6) throw new Error("PIN too long (max 6 digits)");
      if (!/^\d+$/.test(String(newPin1))) throw new Error("PIN must be digits only");

      await apiFetch(
        "/api/pin/config",
        { method: "PUT", body: { oldPin: String(oldPin || ""), newPin: String(newPin1) } },
        apiBase
      );

      setPinMsg("PIN updated");
      setPinForm({ oldPin: "", newPin1: "", newPin2: "" });
    } catch (e) {
      setPinErr(e.message || "Save PIN failed");
    } finally {
      setPinPhase("idle");
      setTimeout(() => {
        setPinMsg("");
        setPinErr("");
      }, 2000);
    }
  };

  /* ==================== Render ==================== */
  return (
    <div className="w-full px-4 pt-2 pb-4">
      {/* Sticky header + tabs */}
      <div className="sticky top-0 z-10 bg-blue-50/80 backdrop-blur supports-[backdrop-filter]:bg-white/70 pb-2 pt-2">
        <div className="text-center">
          <Divider label={t("Settings")} />
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2 justify-center">
          {[
            { id: "general", label: t("General") },
            { id: "relays", label: t("Relays") },
            { id: "analogs", label: t("Analogs") },
            { id: "rs485", label: t("RS485") },
            { id: "security", label: t("Security / PIN") },
          ].map((tb) => (
            <button
              key={tb.id}
              onClick={() => setTab(tb.id)}
              className={[
                "px-4 py-2 rounded-xl border text-sm md:text-base",
                tab === tb.id
                  ? "border-blue-400 bg-blue-50 text-blue-700"
                  : "border-slate-300 text-slate-600 hover:bg-white",
              ].join(" ")}
            >
              {tb.label}
            </button>
          ))}

          <div className="ml-auto flex items-center gap-2 pr-1">
            <button
              onClick={onBack}
              className="px-4 py-2 rounded-2xl border-2 border-slate-300 text-slate-700 hover:bg-white"
            >
              {t("Back")}
            </button>
            <button
              onClick={onSave}
              className="px-4 py-2 rounded-2xl border-2 border-emerald-400 text-emerald-700 hover:bg-emerald-50"
            >
              {t("Save")}
            </button>
            {saved && <span className="text-emerald-600">{t("Saved!")}</span>}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-h-[calc(100vh-180px)] overflow-y-auto pr-1">
        <div className="grid grid-cols-12 gap-6 mt-4">
          <div className="col-span-12 lg:col-span-10 xl:col-span-8 space-y-6">
            {/* GENERAL */}
            {tab === "general" && (
              <Card title={t("General")}>
                <Row label={t("Language")}>
                  <select
                    value={draft.language || "en"}
                    onChange={(e) => onChange("language", e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 bg-white"
                  >
                    {[
                      { value: "en", label: "English" },
                      { value: "vi", label: "Tiếng Việt" },
                    ].map((l) => (
                      <option key={l.value} value={l.value}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </Row>

                <Row label={t("Time format")}>
                  <div className="flex gap-3">
                    {["24h", "12h"].map((fmt) => (
                      <label
                        key={fmt}
                        className={`px-4 py-2 rounded-xl border ${
                          draft.timeFormat === fmt
                            ? "border-blue-400 bg-blue-50 text-blue-700"
                            : "border-slate-300"
                        }`}
                      >
                        <input
                          type="radio"
                          className="mr-2"
                          checked={draft.timeFormat === fmt}
                          onChange={() => onChange("timeFormat", fmt)}
                        />
                        {fmt}
                      </label>
                    ))}
                  </div>
                </Row>
              </Card>
            )}

            {/* RELAYS */}
            {tab === "relays" && (
              <Card title={t("Relays")}>
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-slate-500 border-b">
                        <th className="py-2 pr-3">{t("Device")}</th>
                        <th className="py-2 pr-3">{t("Relay")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewRelayRows.map((row) => {
  const isDup = row.relay > 0 && dupRelaySet.has(row.relay);
  return (
    <tr key={row.id} className="border-b last:border-0">
      {/* Device label (dịch) */}
      <td className="py-2 pr-3 align-middle">
        <div className="w-full rounded-xl border border-slate-200 px-3 py-2 bg-slate-50">
          <span className="text-slate-800">{deviceLabel(row)}</span>
        </div>
        {/* (tuỳ chọn) hiển thị id gốc nhỏ bên dưới cho dễ debug */}
        {/* <div className="text-[11px] text-slate-400 mt-1">{row.id}</div> */}
      </td>

      {/* Relay select giữ nguyên */}
      <td className="py-2 pr-3">
        <select
          value={row.relay || 0}
          onChange={(e) =>
            setRelayRow(row._i, { relay: Number(e.target.value) })
          }
          className={[
            "w-full rounded-xl border px-3 py-2 bg-white",
            isDup ? "border-rose-400" : "border-slate-300",
          ].join(" ")}
        >
          {[
            { value: 0, label: t("None") },
            ...Array.from(
              { length: Number(draft.relayTotal ?? 16) },
              (_, i) => ({ value: i + 1, label: `#${i + 1}` })
            ),
          ].map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {isDup && (
          <div className="text-rose-600 text-xs mt-1">
            {t("Duplicate relay number")}
          </div>
        )}
      </td>
    </tr>
  );
})}

                    </tbody>
                  </table>
                </div>

                <div className="flex flex-wrap items-center gap-3 mt-4">
                  <button
                    onClick={resetRelayMapByApiOrder}
                    className="px-4 py-2 rounded-xl border-2 border-slate-300 text-slate-700 hover:bg-white"
                  >
                    {t("Reset mapping")}
                  </button>
                  <button
                    onClick={loadRelayMapping}
                    disabled={isBusy}
                    className="px-4 py-2 rounded-xl border-2 border-slate-300 text-slate-700 hover:bg-white disabled:opacity-50"
                  >
                    {t("Load current mapping")}
                  </button>
                  <button
                    onClick={saveRelayMapping}
                    disabled={isBusy}
                    className="px-4 py-2 rounded-2xl border-2 border-emerald-400 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                  >
                    {t("Save mapping to device")}
                  </button>
                  <button
                    onClick={resetRelayMap}
                    className="px-4 py-2 rounded-xl border-2 border-slate-300 text-slate-700 hover:bg-white"
                  >
                    {t("Reset to sequential")}
                  </button>
                  {!!msg && <span className="text-slate-600">{msg}</span>}
                  {!!devErr && <span className="text-rose-600">{devErr}</span>}
                </div>
              </Card>
            )}

            {/* ANALOGS */}
            {tab === "analogs" && (
              <Card title={t("Analogs (AI Modes)")}>
                <div className="mb-3 text-sm text-slate-600">
                  {t(
                    "Set the input mode for 4 AI channels. Only 'AI' and 'MODBUS' are supported."
                  )}
                </div>

                <div className="mt-2 overflow-x-auto">
                  <table className="min-w-[420px] text-sm">
                    <thead>
                      <tr className="text-left text-slate-500 border-b">
                        <th className="py-2 pr-3 w-24">{t("Channel")}</th>
                        <th className="py-2 pr-3">{t("Mode")}</th>
                        <th className="py-2 pr-3 w-36">{t("Action")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {aiItems.map((row) => (
                        <tr key={row.index} className="border-b last:border-0">
                          <td className="py-2 pr-3 font-medium">
                            AI{row.index}
                          </td>
                          <td className="py-2 pr-3">
                            <select
                              value={row.mode}
                              onChange={(e) =>
                                setAiModeLocal(
                                  row.index,
                                  e.target.value.toUpperCase()
                                )
                              }
                              className="w-full rounded-xl border border-slate-300 px-3 py-2 bg-white"
                              disabled={isAiBusy}
                            >
                              <option value="AI">AI</option>
                              <option value="MODBUS">MODBUS</option>
                            </select>
                          </td>
                          <td className="py-2 pr-3">
                            <button
                              onClick={() => saveAiMode(row.index)}
                              disabled={isAiBusy}
                              className="px-3 py-2 rounded-xl border-2 border-emerald-400 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                            >
                              {t("Save")}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center gap-3 mt-4">
                  <button
                    onClick={fetchAiConfig}
                    disabled={isAiBusy}
                    className="px-4 py-2 rounded-xl border-2 border-slate-300 text-slate-700 hover:bg-white disabled:opacity-50"
                  >
                    {t("Reload")}
                  </button>
                  <button
                    onClick={saveAiModeAll}
                    disabled={isAiBusy}
                    className="px-4 py-2 rounded-2xl border-2 border-emerald-400 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                  >
                    {t("Save all")}
                  </button>
                  {!!aiMsg && (
                    <span className="text-slate-600 text-sm">{aiMsg}</span>
                  )}
                  {!!aiErr && (
                    <span className="text-rose-600 text-sm">{aiErr}</span>
                  )}
                </div>
              </Card>
            )}
            <NumericKeypad
              open={addrKpOpen}
              initial={parseInt(rsForm.address, 10) || 1}
              min={1}
              max={255}
              onClose={closeAddrKp}
              onApply={applyAddrKp}
              t={t}
            />
            {/* RS485 */}
            {tab === "rs485" && (
              <Card title={t("RS485 Settings")}>
                {rsPhase === "loading" && (
                  <div className="mb-3 text-sm text-slate-500">
                    {t("Loading current RS485 configuration...")}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Address (tap-to-open keypad like TimeView) */}
                  <div>
                    <div className="text-sm text-slate-500 mb-2">
                      {t("Device address (1..255)")}
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        inputMode="none"
                        readOnly
                        value={rsForm.address}
                        onClick={openAddrKp}
                        className="flex-1 h-11 text-center text-lg rounded-xl border border-slate-300 px-3 bg-white select-none cursor-pointer"
                        title={t("Tap to enter")}
                      />
                      <button
                        type="button"
                        onClick={openAddrKp}
                        disabled={rsPhase === "loading"}
                        className="h-11 px-4 rounded-xl border border-slate-300 bg-white active:scale-[0.98] inline-flex items-center gap-2"
                        aria-label={t("Open keypad")}
                        title={t("Open keypad")}
                      >
                        <FontAwesomeIcon icon={faKeyboard} />
                        {t("Keypad")}
                      </button>
                    </div>

                    <div className="mt-1 text-[13px] text-slate-400">
                      {t("Tap the field or button to open keypad")}
                    </div>
                  </div>

                  {/* Baud */}
                  <div>
                    <div className="text-sm text-slate-500 mb-2">
                      {t("Baud rate")}
                    </div>
                    <select
                      value={rsForm.baud}
                      onChange={(e) =>
                        setRsForm((f) => ({ ...f, baud: e.target.value }))
                      }
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 bg-white"
                      disabled={rsPhase === "loading"}
                    >
                      {BAUD_LIST.map((b) => (
                        <option key={b} value={String(b)}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Parity */}
                  <div>
                    <div className="text-sm text-slate-500 mb-2">
                      {t("Parity")}
                    </div>
                    <select
                      value={rsForm.parity}
                      onChange={(e) =>
                        setRsForm((f) => ({ ...f, parity: e.target.value }))
                      }
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 bg-white"
                      disabled={rsPhase === "loading"}
                    >
                      <option value="0">{t("None")}</option>
                      <option value="1">{t("Odd")}</option>
                      <option value="2">{t("Even")}</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-5">
                  <button
                    onClick={saveRsAll}
                    disabled={rsPhase === "saving"}
                    className="px-4 py-2 rounded-2xl border-2 border-emerald-400 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                  >
                    {t("Write to PLC")}
                  </button>
                  <button
                    onClick={fetchRs485}
                    disabled={rsPhase === "saving"}
                    className="px-4 py-2 rounded-xl border-2 border-slate-300 text-slate-700 hover:bg-white disabled:opacity-50"
                  >
                    {t("Reload")}
                  </button>
                  {!!rsMsg && (
                    <span className="text-slate-600 text-sm">{rsMsg}</span>
                  )}
                  {!!rsErr && (
                    <span className="text-rose-600 text-sm">{rsErr}</span>
                  )}
                </div>

                <div className="mt-4 text-sm text-slate-600">
                  {t("Current")}: addr <b>{rsCfg.address}</b>, baud{" "}
                  <b>{rsCfg.baud}</b>, parity{" "}
                  <b>{PARITY_LABEL[rsCfg.parity] ?? rsCfg.parity}</b>
                </div>
              </Card>
            )}
            {/* ==================== [PIN] Security Tab ==================== */}
            {tab === "security" && (
              <>
                <Card title={t("Security / PIN")}>
                  <div className="text-sm text-slate-600 mb-3">
                    {t(
                      "Change the PIN used to access the Settings page. Default PIN is 1 if not set."
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Old PIN */}
                    <div>
                      <div className="text-sm text-slate-500 mb-2">{t("Current PIN")}</div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          inputMode="none"
                          value={pinForm.oldPin.replace(/./g, "•")}
                          onClick={openKpOld}
                          className="flex-1 h-11 text-center text-lg rounded-xl border border-slate-300 px-3 bg-white select-none cursor-pointer"
                          title={t("Tap to enter")}
                        />
                        <button
                          onClick={openKpOld}
                          className="h-11 px-4 rounded-xl border border-slate-300 bg-white active:scale-[0.98]"
                        >
                          {t("Keypad")}
                        </button>
                      </div>
                    </div>

                    {/* New PIN */}
                    <div>
                      <div className="text-sm text-slate-500 mb-2">{t("New PIN")}</div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          inputMode="none"
                          value={pinForm.newPin1.replace(/./g, "•")}
                          onClick={openKpNew1}
                          className="flex-1 h-11 text-center text-lg rounded-xl border border-slate-300 px-3 bg-white select-none cursor-pointer"
                          title={t("Tap to enter")}
                        />
                        <button
                          onClick={openKpNew1}
                          className="h-11 px-4 rounded-xl border border-slate-300 bg-white active:scale-[0.98]"
                        >
                          {t("Keypad")}
                        </button>
                      </div>
                    </div>

                    {/* Confirm PIN */}
                    <div>
                      <div className="text-sm text-slate-500 mb-2">{t("Confirm new PIN")}</div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          inputMode="none"
                          value={pinForm.newPin2.replace(/./g, "•")}
                          onClick={openKpNew2}
                          className="flex-1 h-11 text-center text-lg rounded-xl border border-slate-300 px-3 bg-white select-none cursor-pointer"
                          title={t("Tap to enter")}
                        />
                        <button
                          onClick={openKpNew2}
                          className="h-11 px-4 rounded-xl border border-slate-300 bg-white active:scale-[0.98]"
                        >
                          {t("Keypad")}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mt-5">
                    <button
                      onClick={savePinChange}
                      disabled={pinPhase === "saving"}
                      className="px-4 py-2 rounded-2xl border-2 border-emerald-400 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                    >
                      {t("Save PIN")}
                    </button>
                    <button
                      onClick={reloadPinInfo}
                      disabled={pinPhase === "saving"}
                      className="px-4 py-2 rounded-xl border-2 border-slate-300 text-slate-700 hover:bg-white disabled:opacity-50"
                    >
                      {t("Reload")}
                    </button>
                    {!!pinMsg && <span className="text-slate-600 text-sm">{pinMsg}</span>}
                    {!!pinErr && <span className="text-rose-600 text-sm">{pinErr}</span>}
                  </div>
                </Card>

                {/* 3 keypad modals dùng lại NumericKeypad (giống TimeView) */}
                <NumericKeypad
                  open={kpOldOpen}
                  integer
                  min={0}
                  max={999999}
                  initial={pinForm.oldPin ? Number(pinForm.oldPin) : 0}
                  onApply={applyKpOld}
                  onClose={closeKpOld}
                  title={t("Enter current PIN")}
                  unit=""
                  t={t}
                />
                <NumericKeypad
                  open={kpNew1Open}
                  integer
                  min={0}
                  max={999999}
                  initial={pinForm.newPin1 ? Number(pinForm.newPin1) : 0}
                  onApply={applyKpNew1}
                  onClose={closeKpNew1}
                  title={t("Enter new PIN")}
                  unit=""
                  t={t}
                />
                <NumericKeypad
                  open={kpNew2Open}
                  integer
                  min={0}
                  max={999999}
                  initial={pinForm.newPin2 ? Number(pinForm.newPin2) : 0}
                  onApply={applyKpNew2}
                  onClose={closeKpNew2}
                  title={t("Confirm new PIN")}
                  unit=""
                  t={t}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
