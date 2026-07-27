import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { storage } from "@/src/utils/storage";
import { sipEngine, SipConfig, SipStatus, CallInfo, SipLogEntry } from "./SipEngine";

const CONFIG_KEY = "sip_config_v1";

export const DEFAULT_SIP_CONFIG: SipConfig = {
  displayName: "Depth Route",
  username: "bman1",
  password: "@a0000OOO",
  domain: "sip.depthroute.com",
  wssUrl: "wss://sip.depthroute.com:8089/ws",
  registerExpires: 300,
};

type Ctx = {
  supported: boolean;
  config: SipConfig | null;
  status: SipStatus;
  activeCall: CallInfo | null;
  calls: CallInfo[];
  logs: SipLogEntry[];
  saveConfig: (cfg: SipConfig) => Promise<void>;
  clearConfig: () => Promise<void>;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  call: (target: string) => Promise<string | null>;
  answer: (id: string) => void;
  hangup: (id?: string) => void;
  setMute: (id: string, muted: boolean) => void;
  setHold: (id: string, hold: boolean) => void;
  sendDTMF: (id: string, tone: string) => void;
};

const SipEngineContext = createContext<Ctx | null>(null);

export function SipEngineProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<SipConfig | null>(null);
  const [tick, setTick] = useState(0);
  const forceUpdate = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    (async () => {
      const stored = await storage.secureGet<SipConfig | null>(CONFIG_KEY, null);
      setConfig(stored || null);
    })();
    const unsub = sipEngine.subscribe(forceUpdate);
    return () => { unsub(); };
  }, [forceUpdate]);

  const saveConfig = useCallback(async (cfg: SipConfig) => {
    await storage.secureSet(CONFIG_KEY, cfg);
    setConfig(cfg);
  }, []);

  const clearConfig = useCallback(async () => {
    await storage.secureRemove(CONFIG_KEY);
    setConfig(null);
    await sipEngine.disconnect();
  }, []);

  const connect = useCallback(async () => {
    if (!config) return;
    await sipEngine.connect(config);
  }, [config]);

  const disconnect = useCallback(async () => {
    await sipEngine.disconnect();
  }, []);

  // Auto-connect once we have a config
  useEffect(() => {
    if (config) {
      sipEngine.connect(config);
    }
    return () => {
      /* keep engine alive across renders */
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config?.username, config?.domain, config?.wssUrl, config?.password]);

  const value: Ctx = {
    supported: sipEngine.isSupported(),
    config,
    status: sipEngine.getStatus(),
    activeCall: sipEngine.getActiveCall(),
    calls: sipEngine.getCalls(),
    logs: sipEngine.getLogs(),
    saveConfig,
    clearConfig,
    connect,
    disconnect,
    call: (t) => sipEngine.call(t),
    answer: (id) => sipEngine.answer(id),
    hangup: (id) => sipEngine.hangup(id),
    setMute: (id, m) => sipEngine.setMute(id, m),
    setHold: (id, h) => sipEngine.setHold(id, h),
    sendDTMF: (id, t) => sipEngine.sendDTMF(id, t),
  };
  return <SipEngineContext.Provider value={value}>{children}</SipEngineContext.Provider>;
}

export function useSipEngine() {
  const c = useContext(SipEngineContext);
  if (!c) throw new Error("useSipEngine must be used inside SipEngineProvider");
  return c;
}
