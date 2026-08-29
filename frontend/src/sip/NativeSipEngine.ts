// NativeSipEngine — the SIP/UDP calling engine backed by the PJSIP native module.
//
// It mirrors the public surface of the legacy (WebRTC/JsSIP) SipEngine so that
// MultiSipContext and every screen keep working unchanged — but the transport is
// native SIP over UDP, never WebRTC. If the native module isn't linked (Expo Go /
// web), it reports status "unsupported" instead of crashing.

import {
  SipConfig,
  SipStatus,
  CallInfo,
  CallState,
  SipLogEntry,
} from "./SipTypes";
import { getPjsip, isPjsipAvailable, PjsipCallState, PjsipRegState } from "@/modules/expo-pjsip";
import { isNativeUp, canPlaceCall, needsReinit } from "./sipLifecycle";
import type { EventSubscription } from "expo-modules-core";

type Listener = () => void;

function regToStatus(s: PjsipRegState): SipStatus {
  switch (s) {
    case "registered": return "registered";
    case "registering":
    case "initializing": return "connecting";
    case "unregistered":
    case "unregistering": return "unregistered";
    case "failed": return "registration_failed";
    case "offline":
    default: return "disconnected";
  }
}

function callState(s: PjsipCallState): CallState {
  switch (s) {
    case "dialing": return "dialing";
    case "ringing":
    case "early": return "ringing";
    case "connecting": return "connecting";
    case "connected": return "connected";
    case "held": return "held";
    case "failed": return "failed";
    case "ended": return "ended";
    default: return "idle";
  }
}

export class NativeSipEngine {
  private status: SipStatus = "disconnected";
  private config: SipConfig | null = null;
  private calls = new Map<string, CallInfo>();
  private logs: SipLogEntry[] = [];
  private listeners = new Set<Listener>();
  private subs: EventSubscription[] = [];

  subscribe(l: Listener): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }
  private notify() { this.listeners.forEach((l) => l()); }
  private log(level: SipLogEntry["level"], msg: string, data?: any) {
    this.logs.push({ ts: Date.now(), level, msg, data });
    if (this.logs.length > 200) this.logs.shift();
  }

  getStatus(): SipStatus { return this.status; }
  getConfig(): SipConfig | null { return this.config; }
  getCalls(): CallInfo[] { return Array.from(this.calls.values()).map((c) => ({ ...c })); }
  getActiveCall(): CallInfo | null {
    for (const c of this.calls.values()) if (c.state !== "ended" && c.state !== "failed") return { ...c };
    return null;
  }
  getLogs(): SipLogEntry[] { return this.logs.slice().reverse(); }
  isSupported(): boolean { return isPjsipAvailable(); }

  private setStatus(s: SipStatus) { this.status = s; this.notify(); }

  private wire() {
    const p = getPjsip();
    if (!p) return;
    // Idempotent: drop any prior subscriptions so a reconnect can't double-fire.
    this.subs.forEach((s) => s.remove());
    this.subs = [];
    this.subs.push(p.addListener("onRegState", (e) => {
      this.setStatus(regToStatus(e.state));
      this.log("info", `reg ${e.state}`, { code: e.code, reason: e.reason });
    }));
    this.subs.push(p.addListener("onIncomingCall", (e) => {
      this.calls.set(e.callId, {
        id: e.callId, direction: "incoming", remote: e.remote, remoteName: e.remoteName,
        state: "ringing", durationSec: 0, muted: false, onHold: false,
      });
      this.notify();
    }));
    this.subs.push(p.addListener("onCallState", (e) => {
      const c = this.calls.get(e.callId) ?? {
        id: e.callId, direction: e.direction ?? "outgoing", remote: "",
        state: "idle" as CallState, durationSec: 0, muted: false, onHold: false,
      };
      c.state = callState(e.state);
      if (e.cause) c.cause = e.cause;
      if (c.state === "connected" && !c.startedAt) c.startedAt = Date.now();
      if (c.state === "ended" || c.state === "failed") {
        c.endedAt = Date.now();
        if (c.startedAt) c.durationSec = Math.round((c.endedAt - c.startedAt) / 1000);
        // Keep briefly so the UI can show the final state, then drop.
        setTimeout(() => { this.calls.delete(e.callId); this.notify(); }, 3000);
      }
      this.calls.set(e.callId, c);
      this.notify();
    }));
    this.subs.push(p.addListener("onError", (e) => {
      this.log("error", `sip error ${e.code}`, { message: e.message });
    }));
  }

  /** The TRUE native registration state — survives a stale JS `status`. */
  getNativeRegState(): PjsipRegState {
    const p = getPjsip();
    if (!p) return "offline";
    try { return (p.getRegistrationState() as PjsipRegState) ?? "offline"; }
    catch { return "offline"; }
  }

  private async initAndRegister(cfg: SipConfig): Promise<void> {
    const p = getPjsip();
    if (!p) return;
    await p.initialize({
      server: cfg.server ?? cfg.domain,
      port: cfg.port ?? 5060,
      transport: cfg.transport ?? "UDP",
      username: cfg.username,
      authUsername: cfg.authUsername ?? cfg.username,
      password: cfg.password,
      domain: cfg.domain,
      outboundProxy: cfg.outboundProxy ?? null,
      registerExpires: cfg.registerExpires ?? 300,
      displayName: cfg.displayName,
    });
    await p.register();
  }

  async connect(cfg: SipConfig): Promise<void> {
    const p = getPjsip();
    if (!p) { this.config = cfg; this.setStatus("unsupported"); return; }
    this.config = cfg;
    this.wire();
    // IDEMPOTENT: if the native stack is already up for this identity, do NOT
    // tear it down and re-create it. Re-initializing an already-registered
    // account caused REGISTER -> unregister -> account=null churn (which then
    // failed makeCall with "Not registered"). Reflect the real native state.
    const native = this.getNativeRegState();
    if (isNativeUp(native)) {
      this.setStatus(regToStatus(native));
      return;
    }
    this.setStatus("connecting");
    try {
      await this.initAndRegister(cfg);
    } catch (e: any) {
      this.setStatus("error");
      this.log("error", "connect failed", { message: e?.message });
    }
  }

  /**
   * Guarantee the native account is ACTUALLY registered before we rely on it
   * (e.g. before makeCall). The native stack can be torn down out-of-band — Expo
   * `OnDestroy` on background, or network loss — while the JS status is a stale
   * "registered". Detect that from the real native state and re-initialize.
   * Returns true only when the native engine reports "registered".
   */
  async ensureRegistered(timeoutMs = 6000): Promise<boolean> {
    const p = getPjsip();
    if (!p || !this.config) return false;
    if (canPlaceCall(this.getNativeRegState())) return true;
    // Native account missing/offline/failed -> reconcile UI and re-initialize.
    this.setStatus("connecting");
    this.wire();
    try { await this.initAndRegister(this.config); }
    catch (e: any) { this.log("error", "re-register failed", { message: e?.message }); }
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const s = this.getNativeRegState();
      if (canPlaceCall(s)) { this.setStatus("registered"); return true; }
      if (s === "failed") { this.setStatus("registration_failed"); return false; }
      await new Promise((r) => setTimeout(r, 300));
    }
    return canPlaceCall(this.getNativeRegState());
  }

  /**
   * Reconcile JS status with the real native state and recover the registration
   * if the native stack was torn down while we still think we're registered.
   * Call this on app foreground / network recovery.
   */
  async reconcile(): Promise<void> {
    if (!this.config) return;
    const native = this.getNativeRegState();
    this.setStatus(regToStatus(native));
    if (needsReinit(native)) {
      await this.connect(this.config);
    }
  }

  async disconnect(): Promise<void> {
    const p = getPjsip();
    this.subs.forEach((s) => s.remove());
    this.subs = [];
    if (p) { try { await p.unregister(); await p.destroy(); } catch { /* ignore */ } }
    this.calls.clear();
    this.setStatus("disconnected");
  }

  async call(target: string): Promise<string | null> {
    const p = getPjsip();
    if (!p) return null;
    const attempt = async (): Promise<string | null> => {
      try { return await p.makeCall(target); }
      catch (e: any) { this.log("error", "makeCall failed", { message: e?.message }); return null; }
    };
    // Use makeCall's OWN result as the signal. The native makeCall throws only
    // when the account is gone (account=null) — the exact stale-state that used
    // to break calling. Do NOT pre-gate on getRegistrationState(): that native
    // reg flag can lag/misreport on flaky networks and would wrongly block a call
    // whose account is in fact usable (outbound INVITEs auth via the endpoint
    // credential, not an active REGISTER). If the first attempt fails, rebuild
    // the account from the stored config and retry ONCE so a torn-down account
    // self-heals instead of failing.
    let id = await attempt();
    if (!id && this.config) {
      this.log("info", "call: native account unavailable — reinitializing and retrying");
      this.setStatus("connecting");
      this.wire();
      try { await this.initAndRegister(this.config); }
      catch (e: any) { this.log("error", "reinit failed", { message: e?.message }); }
      await new Promise((r) => setTimeout(r, 1000)); // let the fresh account settle
      id = await attempt();
    }
    if (!id) return null;
    this.calls.set(id, {
      id, direction: "outgoing", remote: target, state: "dialing",
      durationSec: 0, muted: false, onHold: false,
    });
    this.notify();
    return id;
  }

  answer(id: string) { getPjsip()?.answerCall(id).catch((e) => this.log("error", "answer failed", e)); }

  hangup(id?: string) {
    const p = getPjsip();
    if (!p) return;
    const target = id ?? this.getActiveCall()?.id;
    if (target) p.hangup(target).catch((e) => this.log("error", "hangup failed", e));
  }

  setMute(id: string, muted: boolean) {
    const p = getPjsip();
    if (!p) return;
    p.setMute(id, muted).catch((e) => this.log("error", "mute failed", e));
    const c = this.calls.get(id);
    if (c) { c.muted = muted; this.calls.set(id, c); this.notify(); }
  }

  setSpeaker(enabled: boolean) { getPjsip()?.setSpeaker(enabled).catch(() => {}); }

  sendDTMF(id: string, tone: string) { getPjsip()?.sendDtmf(id, tone).catch((e) => this.log("error", "dtmf failed", e)); }

  // ---- features not in the native PJSIP module scope yet (honest no-ops) ----
  // These existed on the WebRTC engine; the native module exposes register/call/
  // answer/hangup/dtmf/mute/speaker only. They report "unsupported" rather than
  // pretending to work — to be added to the native module when needed.
  setHold(id: string, hold: boolean) {
    const c = this.calls.get(id);
    if (c) { c.onHold = hold; this.calls.set(id, c); this.notify(); }
    this.log("warn", "hold not implemented on the native engine yet", { id, hold });
  }
  async setHoldWithLocalMoh(
    _id: string, _fileUri: string, _opts?: { loop?: boolean; volume?: number },
  ): Promise<{ ok: boolean; reason?: string }> {
    return { ok: false, reason: "not_supported_native" };
  }
  async resumeFromLocalMoh(_id: string): Promise<void> { /* no local MOH on the native path */ }
  isLocalMohActive(_id: string): boolean { return false; }
  transfer(_id: string, _target: string): boolean {
    this.log("warn", "transfer not implemented on the native engine yet");
    return false;
  }
}
