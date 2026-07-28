// Multi-account SIP context — Zoiper-style.
// Manages an array of SIP accounts, each with its own SipEngine (JsSIP UA).
// Persists accounts to secure storage. Selected account drives outgoing calls.
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react";
import { storage } from "@/src/utils/storage";
import { SipEngine, SipConfig, SipStatus, CallInfo, SipLogEntry } from "./SipEngine";

export type SipAccount = {
  id: string;
  displayName: string;
  username: string;
  password: string;
  domain: string;
  host?: string;          // SIP host (defaults to domain if empty)
  port?: number;          // SIP port (5060 UDP/TCP, 5061 TLS, 443/8089 WSS)
  transport?: "UDP" | "TCP" | "TLS" | "WSS";
  wssUrl?: string;        // used only when transport === "WSS"; auto-derived if missing
  callerId?: string;
  authUser?: string;
  enabled: boolean;
  color?: string;
};

export type AccountRuntime = {
  account: SipAccount;
  engine: SipEngine;
  status: SipStatus;
  lastError?: string;
  calls: CallInfo[];
};

const ACCOUNTS_KEY = "sip_accounts_v1";
const SELECTED_KEY = "sip_selected_account_v1";

const ACCENT_COLORS = ["#22C55E", "#3B82F6", "#A855F7", "#F59E0B", "#14B8A6", "#EC4899", "#EF4444"];

export const DEFAULT_ACCOUNT: Omit<SipAccount, "id" | "color"> = {
  displayName: "Depth Route",
  username: "bman1",
  password: "@a0000OOO",
  domain: "sip.depthroute.com",
  host: "sip.depthroute.com",
  port: 5060,
  transport: "UDP",
  wssUrl: "",
  callerId: "",
  authUser: "",
  enabled: true,
};

function accountId() {
  return `acc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function toConfig(a: SipAccount): SipConfig {
  const host = a.host || a.domain;
  const transport = a.transport || "WSS";
  let wssUrl = a.wssUrl || "";
  if (transport === "WSS" && !wssUrl) {
    const port = a.port || 8089;
    wssUrl = `wss://${host}:${port}/ws`;
  } else if (transport === "WS" as any) {
    const port = a.port || 8088;
    wssUrl = `ws://${host}:${port}/ws`;
  }
  return {
    displayName: a.displayName || a.username,
    username: a.username,
    password: a.password,
    domain: a.domain,
    wssUrl,
    registerExpires: 300,
  };
}

// UDP/TCP/TLS cannot register from a browser — only WSS/WS works.
function canRegisterInBrowser(a: SipAccount): boolean {
  const t = a.transport || "WSS";
  return t === "WSS" || (t as any) === "WS";
}

type Ctx = {
  supported: boolean;
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
  const [engines] = useState<Map<string, SipEngine>>(() => new Map());
  const [tick, setTick] = useState(0);
  const forceUpdate = useCallback(() => setTick((t) => t + 1), []);

  // Ensure an engine exists for a given account
  const ensureEngine = useCallback((a: SipAccount) => {
    let e = engines.get(a.id);
    if (!e) {
      e = new SipEngine();
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
        if (a.enabled && canRegisterInBrowser(a)) {
          const eng = ensureEngine(a);
          eng.connect(toConfig(a));
        }
      });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persist = useCallback(async (next: SipAccount[]) => {
    setAccounts(next);
    await storage.secureSet(ACCOUNTS_KEY, next);
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
    if (account.enabled && canRegisterInBrowser(account)) {
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
    if (updated.enabled && canRegisterInBrowser(updated)) await eng.connect(toConfig(updated));
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

  const call: Ctx["call"] = useCallback(async (target, accId) => {
    const id = accId || selectedId;
    if (!id) return { callId: null, accountId: null, error: "No SIP account selected. Add one in SIP Accounts." };
    const a = accounts.find((x) => x.id === id);
    if (!a) return { callId: null, accountId: null, error: "SIP account not found" };
    const eng = ensureEngine(a);
    if (eng.getStatus() !== "registered") {
      return { callId: null, accountId: id, error: `Account "${a.displayName || a.username}" is not registered (${eng.getStatus()}). Fix in SIP Accounts.` };
    }
    const callId = await eng.call(target);
    if (!callId) return { callId: null, accountId: id, error: "Failed to start call — see log" };
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
    supported: typeof (globalThis as any).RTCPeerConnection !== "undefined",
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
