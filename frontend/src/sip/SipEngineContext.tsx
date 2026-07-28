// Backward-compat shim — maps the old single-account API to the new MultiSipContext.
// Existing components using `useSipEngine()` and `<SipEngineProvider>` keep working
// but everything is now routed through the multi-account engine.
import React, { ReactNode } from "react";
import { MultiSipProvider, useMultiSip, DEFAULT_ACCOUNT } from "./MultiSipContext";
import type { SipConfig, SipStatus, CallInfo, SipLogEntry } from "./SipEngine";

export const DEFAULT_SIP_CONFIG: SipConfig = {
  ...DEFAULT_ACCOUNT,
  registerExpires: 300,
};

export function SipEngineProvider({ children }: { children: ReactNode }) {
  return <MultiSipProvider>{children}</MultiSipProvider>;
}

/**
 * Legacy hook — maps to selected account.
 * config -> selectedAccount, status -> selectedRuntime.status
 * saveConfig -> updateAccount or addAccount if none
 * clearConfig -> removeAccount (selected)
 * activeCall/calls -> across all engines
 */
export function useSipEngine() {
  const m = useMultiSip();
  const sel = m.selectedAccount;
  const runtime = m.selectedRuntime;
  const status: SipStatus = runtime?.status || (m.supported ? "disconnected" : "unsupported");

  const config: SipConfig | null = sel ? {
    displayName: sel.displayName,
    username: sel.username,
    password: sel.password,
    domain: sel.domain,
    wssUrl: sel.wssUrl,
    registerExpires: 300,
  } : null;

  const calls: CallInfo[] = m.runtimes.flatMap((r) => r.calls);
  const activeCall: CallInfo | null = m.activeCall?.call || null;
  const logs: SipLogEntry[] = m.aggregateLogs;

  const saveConfig = async (cfg: SipConfig) => {
    if (sel) {
      await m.updateAccount(sel.id, {
        displayName: cfg.displayName,
        username: cfg.username,
        password: cfg.password,
        domain: cfg.domain,
        wssUrl: cfg.wssUrl,
      });
    } else {
      await m.addAccount({
        displayName: cfg.displayName,
        username: cfg.username,
        password: cfg.password,
        domain: cfg.domain,
        wssUrl: cfg.wssUrl,
        enabled: true,
      });
    }
  };

  const clearConfig = async () => {
    if (sel) await m.removeAccount(sel.id);
  };

  const connect = async () => { if (sel) await m.connect(sel.id); };
  const disconnect = async () => { if (sel) await m.disconnect(sel.id); };

  return {
    supported: m.supported,
    config,
    status,
    activeCall,
    calls,
    logs,
    saveConfig,
    clearConfig,
    connect,
    disconnect,
    call: async (t: string) => {
      const r = await m.call(t);
      return r.callId;
    },
    answer: (id: string) => m.answer(id),
    hangup: (id?: string) => m.hangup(id),
    setMute: (id: string, muted: boolean) => m.setMute(id, muted),
    setHold: (id: string, hold: boolean) => m.setHold(id, hold),
    sendDTMF: (id: string, tone: string) => m.sendDTMF(id, tone),
  };
}
