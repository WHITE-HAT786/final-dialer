// Multi-account SIP context.
// Manages an array of SIP accounts, each with its own NativeSipEngine (PJSIP,
// SIP over UDP). Persists accounts to secure storage. Selected account drives
// outgoing calls. The WebRTC/JsSIP engine is no longer on the calling path.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { AppState, PermissionsAndroid, Platform } from "react-native";
import { storage } from "@/src/utils/storage";

// RECORD_AUDIO is required both to capture mic audio for RTP AND to start the
// `microphone` foreground service (Android 14+ throws SecurityException without
// it). Request it before we register so the call path and the keep-alive service
// have it. Best-effort: a denial must not crash or block registration.
async function ensureMicPermission(): Promise<void> {
  if (Platform.OS !== "android") return;
  try {
    const granted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
    if (!granted) await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
  } catch { /* best effort */ }
}
import { SipConfig, SipStatus, CallInfo, SipLogEntry } from "./SipTypes";
import { NativeSipEngine } from "./NativeSipEngine";
import { isPjsipAvailable } from "@/modules/expo-pjsip";
import { loadSipAccountFromBackend } from "./loadSipConfig";
import {
  SipBootstrapState,
  SipConfigAccount,
  classifyBootstrapError,
  isRegistrableConfig,
  mapEngineStatus,
} from "./sipBootstrap";

export type SipAccount = {
  id: string;
  displayName: string;
  username: string;
  password: string;
  domain: string;
  host?: string;          // SIP host (defaults to domain if empty)
  port?: number;          // SIP port (5060 UDP/TCP, 5061 TLS)
  transport?: "UDP" | "TCP" | "TLS" | "WSS";
  wssUrl?: string;        // legacy WebRTC only; unused on the native UDP path
  outboundProxy?: string | null;
  callerId?: string;
  authUser?: string;
  registerExpires?: number; // backend-supplied REGISTER expiry (seconds)
  enabled: boolean;
  color?: string;
  ephemeral?: boolean; // backend-bootstrapped primary line — NEVER persisted
};

export type AccountRuntime = {
  account: SipAccount;
  engine: NativeSipEngine;
  status: SipStatus;
  lastError?: string;
  calls: CallInfo[];
};

const ACCOUNTS_KEY = "sip_accounts_v1";
const SELECTED_KEY = "sip_selected_account_v1";
// The customer's own extension, loaded from /sip-config.php after auth. Held in
// memory only (never persisted), so its SIP password never touches storage.
const PRIMARY_ID = "primary_backend";

const ACCENT_COLORS = ["#22C55E", "#3B82F6", "#A855F7", "#F59E0B", "#14B8A6", "#EC4899", "#EF4444"];

// Empty by design — NO hardcoded credentials. The real account is loaded from
// GET /api/app/sip-config.php after login (see loadSipAccountFromBackend).
export const DEFAULT_ACCOUNT: Omit<SipAccount, "id" | "color"> = {
  displayName: "Depth Route",
  username: "",
  password: "",
  domain: "",
  host: "",
  port: 5060,
  transport: "UDP",
  wssUrl: "",
  outboundProxy: null,
  callerId: "",
  authUser: "",
  enabled: true,
};

function accountId() {
  return `acc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function toConfig(a: SipAccount): SipConfig {
  const host = a.host || a.domain;
  const transport = (a.transport as "UDP" | "TCP" | "TLS") || "UDP";
  return {
    displayName: a.displayName || a.username,
    username: a.username,
    authUsername: a.authUser || a.username,
    password: a.password,
    domain: a.domain,
    wssUrl: "",                    // native UDP path — no WebRTC
    server: host,
    port: a.port || 5060,
    transport,
    outboundProxy: a.outboundProxy ?? null,
    registerExpires: a.registerExpires ?? 300,
  };
}

// A native UDP account is registrable once it has host + username + password.
function canRegister(a: SipAccount): boolean {
  return !!(a.username && a.password && (a.host || a.domain));
}

type Ctx = {
  supported: boolean;
  // Backend-driven primary line (the customer's own extension via /sip-config.php)
  bootstrap: SipBootstrapState;
  bootstrapError?: string;
  bootstrapPrimary: () => Promise<void>;
  teardownPrimary: () => Promise<void>;
  retryBootstrap: () => void;
  accounts: SipAccount[];
  runtimes: AccountRuntime[];
  selectedId: string | null;
  selectedAccount: SipAccount | null;
  selectedRuntime: AccountRuntime | null;
  aggregateLogs: SipLogEntry[];
  addAccount: (a: Omit<SipAccount, "id" | "color"> & { color?: string }) => Promise<string>;
  updateAccount: (id: string, patch: Partial<SipAccount>) => Promise<void>;
  removeAccount: (id: string) => Promise<void>;
  setSelected: (id: string) => Promise<void>;
  connect: (id: string) => Promise<void>;
  disconnect: (id: string) => Promise<void>;
  call: (target: string, accountId?: string) => Promise<{ callId: string | null; accountId: string | null; error?: string }>;
  answer: (callId: string) => void;
  hangup: (callId?: string) => void;
  setMute: (callId: string, muted: boolean) => void;
  setHold: (callId: string, hold: boolean) => void;
  setHoldWithLocalMoh: (callId: string, fileUri: string, opts?: { loop?: boolean; volume?: number }) => Promise<{ ok: boolean; reason?: string }>;
  resumeFromLocalMoh: (callId: string) => Promise<void>;
  isLocalMohActive: (callId: string) => boolean;
  sendDTMF: (callId: string, tone: string) => void;
  transfer: (callId: string, target: string) => boolean;
  findCallOwner: (callId: string) => AccountRuntime | null;
  activeCall: { call: CallInfo; runtime: AccountRuntime } | null;
};

const MultiSipContext = createContext<Ctx | null>(null);

export function MultiSipProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<SipAccount[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [engines] = useState<Map<string, NativeSipEngine>>(() => new Map());
  const [tick, setTick] = useState(0);
  const forceUpdate = useCallback(() => setTick((t) => t + 1), []);
  // Bootstrap state for the customer's OWN backend line (the primary account).
  const [bootstrap, setBootstrap] = useState<SipBootstrapState>("idle");
  const [bootstrapError, setBootstrapError] = useState<string | undefined>(undefined);

  // Ensure an engine exists for a given account
  const ensureEngine = useCallback((a: SipAccount) => {
    let e = engines.get(a.id);
    if (!e) {
      e = new NativeSipEngine();
      e.subscribe(forceUpdate);
      engines.set(a.id, e);
    }
    return e;
  }, [engines, forceUpdate]);

  // Load persisted accounts & selection on mount
  useEffect(() => {
    (async () => {
      const list = (await storage.secureGet<SipAccount[]>(ACCOUNTS_KEY, [])) || [];
      const sel = (await storage.getItem<string>(SELECTED_KEY, "")) || (list[0]?.id ?? null);
      setAccounts(list);
      setSelectedId(sel);
      // Auto-connect enabled accounts (only if browser-compatible transport)
      list.forEach((a) => {
        if (a.enabled && canRegister(a)) {
          const eng = ensureEngine(a);
          eng.connect(toConfig(a));
        }
      });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persist = useCallback(async (next: SipAccount[]) => {
    setAccounts(next);
    // NEVER persist the backend-bootstrapped (ephemeral) account or its SIP
    // password. It is re-fetched from /sip-config.php on each authenticated
    // session and lives only in memory.
    await storage.secureSet(ACCOUNTS_KEY, next.filter((a) => !a.ephemeral));
  }, []);

  const addAccount: Ctx["addAccount"] = useCallback(async (a) => {
    const id = accountId();
    const color = a.color || ACCENT_COLORS[accounts.length % ACCENT_COLORS.length];
    const account: SipAccount = { id, color, ...a };
    const next = [...accounts, account];
    await persist(next);
    if (!selectedId) {
      setSelectedId(id);
      await storage.setItem(SELECTED_KEY, id);
    }
    if (account.enabled && canRegister(account)) {
      const eng = ensureEngine(account);
      eng.connect(toConfig(account));
    }
    return id;
  }, [accounts, ensureEngine, persist, selectedId]);

  const updateAccount: Ctx["updateAccount"] = useCallback(async (id, patch) => {
    const next = accounts.map((a) => (a.id === id ? { ...a, ...patch } : a));
    await persist(next);
    const updated = next.find((a) => a.id === id);
    if (!updated) return;
    const eng = ensureEngine(updated);
    await eng.disconnect();
    if (updated.enabled && canRegister(updated)) await eng.connect(toConfig(updated));
  }, [accounts, ensureEngine, persist]);

  const removeAccount: Ctx["removeAccount"] = useCallback(async (id) => {
    const eng = engines.get(id);
    if (eng) { await eng.disconnect(); engines.delete(id); }
    const next = accounts.filter((a) => a.id !== id);
    await persist(next);
    if (selectedId === id) {
      const newSel = next[0]?.id ?? null;
      setSelectedId(newSel);
      if (newSel) await storage.setItem(SELECTED_KEY, newSel);
      else await storage.removeItem(SELECTED_KEY);
    }
  }, [accounts, engines, persist, selectedId]);

  const setSelected: Ctx["setSelected"] = useCallback(async (id) => {
    if (!accounts.find((a) => a.id === id)) return;
    setSelectedId(id);
    await storage.setItem(SELECTED_KEY, id);
  }, [accounts]);

  const connect: Ctx["connect"] = useCallback(async (id) => {
    const a = accounts.find((x) => x.id === id);
    if (!a) return;
    const eng = ensureEngine(a);
    await eng.connect(toConfig(a));
  }, [accounts, ensureEngine]);

  const disconnect: Ctx["disconnect"] = useCallback(async (id) => {
    const eng = engines.get(id);
    if (eng) await eng.disconnect();
  }, [engines]);

  // --- Backend-driven SIP bootstrap (the customer's OWN extension) -----------
  // Called by SipAuthBridge once the user is authenticated. Fetches the device
  // credentials from /sip-config.php (token only) and registers over SIP/UDP.
  const bootstrapPrimary = useCallback(async () => {
    setBootstrapError(undefined);
    setBootstrap("loading");
    let cfg: SipConfigAccount | null = null;
    try {
      cfg = await loadSipAccountFromBackend(); // GET /sip-config.php — bearer token only
    } catch (e) {
      const { state, message } = classifyBootstrapError(e);
      setBootstrap(state);
      setBootstrapError(message);
      return; // terminal: no crash, no auto-retry loop; manual retry only
    }
    if (!isRegistrableConfig(cfg)) {
      setBootstrap("error");
      setBootstrapError("Incomplete SIP configuration from the server.");
      return;
    }
    // In-memory only — never persisted (no secureSet path), so the SIP password
    // never touches storage. Replace any prior primary; keep manual accounts.
    const primary: SipAccount = { id: PRIMARY_ID, color: ACCENT_COLORS[0], ephemeral: true, ...cfg };
    setAccounts((prev) => [primary, ...prev.filter((a) => a.id !== PRIMARY_ID)]);
    setSelectedId(PRIMARY_ID); // make the customer's own line the active one
    if (!isPjsipAvailable()) {
      // Native PJSIP module not linked (Expo Go / web / missing .so). Config is
      // loaded, but SIP/UDP registration cannot run — report it honestly.
      setBootstrap("unsupported");
      return;
    }
    setBootstrap("registering");
    await ensureMicPermission(); // mic for RTP + the microphone foreground service
    const eng = ensureEngine(primary);
    await eng.connect(toConfig(primary)); // engine drives status from here (effect below)
  }, [ensureEngine]);

  const teardownPrimary = useCallback(async () => {
    const eng = engines.get(PRIMARY_ID);
    if (eng) {
      try { await eng.disconnect(); } catch { /* best effort: unregister + destroy */ }
      engines.delete(PRIMARY_ID);
    }
    // Drop the account (and its in-memory SIP password) from state entirely.
    setAccounts((prev) => prev.filter((a) => a.id !== PRIMARY_ID));
    setSelectedId((prev) => (prev === PRIMARY_ID ? null : prev));
    setBootstrapError(undefined);
    setBootstrap("idle");
  }, [engines]);

  const retryBootstrap = useCallback(() => { void bootstrapPrimary(); }, [bootstrapPrimary]);

  // Reflect the primary engine's live registration status into `bootstrap`, but
  // ONLY once registration has started. Load-phase states (idle/loading/
  // no_extension/needs_provision/unavailable/unsupported/error) are owned by
  // bootstrapPrimary and must not be clobbered by the always-created runtime engine.
  useEffect(() => {
    void tick;
    setBootstrap((prev) => {
      if (prev !== "registering" && prev !== "registered" && prev !== "unregistered" && prev !== "registration_failed") {
        return prev;
      }
      const eng = engines.get(PRIMARY_ID);
      if (!eng) return prev;
      return mapEngineStatus(eng.getStatus());
    });
  }, [tick, engines]);

  // Recover registrations when the app returns to the foreground (or the network
  // comes back). The native PJSIP stack can be torn down while backgrounded
  // (Expo OnDestroy) — reconcile() re-checks the REAL native state and re-registers
  // if needed, so we never sit in a stale "registered" with a dead account.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      if (s !== "active") return;
      engines.forEach((eng) => { void eng.reconcile(); });
    });
    return () => sub.remove();
  }, [engines]);

  const call: Ctx["call"] = useCallback(async (target, accId) => {
    const id = accId || selectedId;
    if (!id) return { callId: null, accountId: null, error: "No SIP account selected. Add one in SIP Accounts." };
    const a = accounts.find((x) => x.id === id);
    if (!a) return { callId: null, accountId: null, error: "SIP account not found" };
    const eng = ensureEngine(a);
    // Do NOT gate on the (possibly stale) JS status. eng.call() verifies the REAL
    // native registration and re-registers if the account was torn down, so we
    // never fail on a stale "registered" nor block a recoverable line.
    const callId = await eng.call(target);
    if (!callId) {
      return {
        callId: null, accountId: id,
        error: `"${a.displayName || a.username}" isn't registered and couldn't reconnect to ${a.host || a.domain}. Check your connection and try again.`,
      };
    }
    return { callId, accountId: id };
  }, [accounts, ensureEngine, selectedId]);

  const findCallOwner = useCallback((callId: string): AccountRuntime | null => {
    for (const a of accounts) {
      const eng = engines.get(a.id);
      if (!eng) continue;
      if (eng.getCalls().some((c) => c.id === callId)) {
        return { account: a, engine: eng, status: eng.getStatus(), calls: eng.getCalls() };
      }
    }
    return null;
  }, [accounts, engines]);

  const answer = useCallback((callId: string) => {
    const owner = findCallOwner(callId);
    owner?.engine.answer(callId);
  }, [findCallOwner]);

  const hangup = useCallback((callId?: string) => {
    if (callId) {
      const owner = findCallOwner(callId);
      owner?.engine.hangup(callId);
      return;
    }
    // hang up any active call across engines
    for (const a of accounts) {
      const eng = engines.get(a.id);
      if (!eng) continue;
      const active = eng.getActiveCall();
      if (active) { eng.hangup(active.id); return; }
    }
  }, [accounts, engines, findCallOwner]);

  const setMute = useCallback((callId: string, muted: boolean) => {
    const owner = findCallOwner(callId);
    owner?.engine.setMute(callId, muted);
  }, [findCallOwner]);
  const setHold = useCallback((callId: string, hold: boolean) => {
    const owner = findCallOwner(callId);
    owner?.engine.setHold(callId, hold);
  }, [findCallOwner]);
  const setHoldWithLocalMoh = useCallback(async (callId: string, fileUri: string, opts?: { loop?: boolean; volume?: number }) => {
    const owner = findCallOwner(callId);
    if (!owner) return { ok: false, reason: "call-not-found" };
    return owner.engine.setHoldWithLocalMoh(callId, fileUri, opts);
  }, [findCallOwner]);
  const resumeFromLocalMoh = useCallback(async (callId: string) => {
    const owner = findCallOwner(callId);
    if (!owner) return;
    await owner.engine.resumeFromLocalMoh(callId);
  }, [findCallOwner]);
  const isLocalMohActive = useCallback((callId: string) => {
    const owner = findCallOwner(callId);
    return owner?.engine.isLocalMohActive(callId) || false;
  }, [findCallOwner]);
  const sendDTMF = useCallback((callId: string, tone: string) => {
    const owner = findCallOwner(callId);
    owner?.engine.sendDTMF(callId, tone);
  }, [findCallOwner]);
  const transfer = useCallback((callId: string, target: string) => {
    const owner = findCallOwner(callId);
    if (!owner) return false;
    return owner.engine.transfer(callId, target);
  }, [findCallOwner]);

  const runtimes: AccountRuntime[] = useMemo(() => {
    void tick; // re-render trigger
    return accounts.map((a) => {
      const eng = ensureEngine(a);
      return {
        account: a,
        engine: eng,
        status: eng.getStatus(),
        calls: eng.getCalls(),
      };
    });
  }, [accounts, ensureEngine, tick]);

  const aggregateLogs: SipLogEntry[] = useMemo(() => {
    void tick;
    const all: SipLogEntry[] = [];
    accounts.forEach((a) => {
      const eng = engines.get(a.id);
      if (!eng) return;
      eng.getLogs().forEach((l) => all.push({ ...l, msg: `[${a.displayName || a.username}] ${l.msg}` }));
    });
    return all.sort((a, b) => b.ts - a.ts).slice(0, 100);
  }, [accounts, engines, tick]);

  const selectedAccount = accounts.find((a) => a.id === selectedId) || null;
  const selectedRuntime = runtimes.find((r) => r.account.id === selectedId) || null;

  const activeCall = useMemo(() => {
    void tick;
    for (const r of runtimes) {
      const c = r.calls.find((x) => !["ended", "failed"].includes(x.state));
      if (c) return { call: c, runtime: r };
    }
    return null;
  }, [runtimes, tick]);

  const value: Ctx = {
    supported: isPjsipAvailable(),
    bootstrap,
    bootstrapError,
    bootstrapPrimary,
    teardownPrimary,
    retryBootstrap,
    accounts,
    runtimes,
    selectedId,
    selectedAccount,
    selectedRuntime,
    aggregateLogs,
    addAccount,
    updateAccount,
    removeAccount,
    setSelected,
    connect,
    disconnect,
    call,
    answer,
    hangup,
    setMute,
    setHold,
    setHoldWithLocalMoh,
    resumeFromLocalMoh,
    isLocalMohActive,
    sendDTMF,
    transfer,
    findCallOwner,
    activeCall,
  };

  return <MultiSipContext.Provider value={value}>{children}</MultiSipContext.Provider>;
}

export function useMultiSip() {
  const c = useContext(MultiSipContext);
  if (!c) throw new Error("useMultiSip must be used inside MultiSipProvider");
  return c;
}
