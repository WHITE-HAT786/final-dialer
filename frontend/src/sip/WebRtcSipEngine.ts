// WebRtcSipEngine — a REAL SIP-over-WebSocket (WSS) calling engine using JsSIP
// for signaling and react-native-webrtc for media (ICE / DTLS-SRTP / RTP).
//
// It mirrors the public surface of NativeSipEngine so MultiSipContext and the
// screens treat UDP and WebRTC engines identically. This is a SEPARATE engine
// and a SEPARATE AOR from the native PJSIP/UDP line — they coexist.
//
// Config comes from /backend/api/app/webrtc-config.php (ws_url + endpoint identity
// + webrtc_secret). Nothing is hardcoded. If react-native-webrtc / jssip aren't
// linked (e.g. Expo Go), the engine reports "unsupported" instead of crashing.

import {
  SipConfig,
  SipStatus,
  CallInfo,
  CallState,
  SipLogEntry,
} from "./SipTypes";
import { canPlaceCall, isNativeUp } from "./sipLifecycle";

type Listener = () => void;

// --- Optional native/lib wiring (guarded so import never crashes JS-only envs) ---
let JsSIP: any = null;
let webrtcLinked = false;
try {
  // react-native-webrtc must register its globals (RTCPeerConnection, mediaDevices…)
  // BEFORE JsSIP is used, so JsSIP's WebRTC calls resolve to the native impl.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const rnwebrtc = require("react-native-webrtc");
  if (rnwebrtc?.registerGlobals) { rnwebrtc.registerGlobals(); webrtcLinked = true; }
} catch { webrtcLinked = false; }
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  JsSIP = require("jssip");
} catch { JsSIP = null; }

function isWebrtcAvailable(): boolean {
  return webrtcLinked && JsSIP != null && typeof (globalThis as any).RTCPeerConnection === "function";
}

/** Map a JsSIP registration lifecycle to the shared SipStatus. */
function regToStatus(s: string): SipStatus {
  switch (s) {
    case "registered": return "registered";
    case "connecting":
    case "registering": return "connecting";
    case "unregistered": return "unregistered";
    case "registrationFailed":
    case "failed": return "registration_failed";
    default: return "disconnected";
  }
}

export class WebRtcSipEngine {
  private status: SipStatus = "disconnected";
  private config: SipConfig | null = null;
  private ua: any = null;
  private sessions = new Map<string, any>(); // callId -> JsSIP RTCSession
  private calls = new Map<string, CallInfo>();
  private logs: SipLogEntry[] = [];
  private listeners = new Set<Listener>();
  private nextId = 1;

  subscribe(l: Listener): () => void { this.listeners.add(l); return () => this.listeners.delete(l); }
  private notify() { this.listeners.forEach((l) => l()); }
  private log(level: SipLogEntry["level"], msg: string, data?: any) {
    this.logs.push({ ts: Date.now(), level, msg, data });
    if (this.logs.length > 200) this.logs.shift();
  }
  private setStatus(s: SipStatus) { this.status = s; this.notify(); }

  getStatus(): SipStatus { return this.status; }
  getConfig(): SipConfig | null { return this.config; }
  getCalls(): CallInfo[] { return Array.from(this.calls.values()).map((c) => ({ ...c })); }
  getActiveCall(): CallInfo | null {
    for (const c of this.calls.values()) if (c.state !== "ended" && c.state !== "failed") return { ...c };
    return null;
  }
  getLogs(): SipLogEntry[] { return this.logs.slice().reverse(); }
  isSupported(): boolean { return isWebrtcAvailable(); }

  /** True native-ish registration state (JsSIP UA), so callers don't trust a stale flag. */
  getNativeRegState(): string {
    if (!this.ua) return "offline";
    try { return this.ua.isRegistered() ? "registered" : (this.ua.isConnected() ? "registering" : "offline"); }
    catch { return "offline"; }
  }

  private wireCall(session: any, id: string, direction: "outgoing" | "incoming", remote: string) {
    this.sessions.set(id, session);
    const set = (state: CallState, extra?: Partial<CallInfo>) => {
      const c = this.calls.get(id) ?? { id, direction, remote, state, durationSec: 0, muted: false, onHold: false };
      c.state = state;
      if (state === "connected" && !c.startedAt) c.startedAt = Date.now();
      if (state === "ended" || state === "failed") {
        c.endedAt = Date.now();
        if (c.startedAt) c.durationSec = Math.round((c.endedAt - c.startedAt) / 1000);
        setTimeout(() => { this.calls.delete(id); this.sessions.delete(id); this.notify(); }, 3000);
      }
      Object.assign(c, extra);
      this.calls.set(id, c);
      this.notify();
    };
    set(direction === "incoming" ? "ringing" : "dialing");
    session.on("progress", () => set("ringing"));
    session.on("accepted", () => set("connecting"));
    session.on("confirmed", () => set("connected"));
    session.on("ended", () => set("ended"));
    session.on("failed", (e: any) => set("failed", { cause: e?.cause }));
    session.on("hold", () => set(this.calls.get(id)?.state ?? "connected", { onHold: true }));
    session.on("unhold", () => set(this.calls.get(id)?.state ?? "connected", { onHold: false }));
  }

  async connect(cfg: SipConfig): Promise<void> {
    this.config = cfg;
    if (!isWebrtcAvailable()) { this.setStatus("unsupported"); this.log("warn", "WebRTC engine not linked in this build"); return; }
    const wsUrl = cfg.wssUrl || "";
    if (!wsUrl) { this.setStatus("error"); this.log("error", "no WSS url for WebRTC account"); return; }
    // Idempotent: if the UA is already up for this identity, don't rebuild it.
    if (this.ua && isNativeUp(this.getNativeRegState())) { this.setStatus(regToStatus(this.getNativeRegState())); return; }
    try {
      this.setStatus("connecting");
      const socket = new JsSIP.WebSocketInterface(wsUrl);
      this.ua = new JsSIP.UA({
        sockets: [socket],
        uri: `sip:${cfg.username}@${cfg.domain}`,
        password: cfg.password,
        register: true,
        session_timers: false,
        user_agent: "DepthRouteMobile/1.0 jssip",
      });
      this.ua.on("connecting", () => this.setStatus("connecting"));
      this.ua.on("registered", () => { this.setStatus("registered"); this.log("info", "WSS registered"); });
      this.ua.on("unregistered", () => this.setStatus("unregistered"));
      this.ua.on("registrationFailed", (e: any) => { this.setStatus("registration_failed"); this.log("error", "WSS registration failed", { cause: e?.cause }); });
      this.ua.on("disconnected", () => { if (this.status === "registered") this.setStatus("connecting"); });
      this.ua.on("newRTCSession", (data: any) => {
        const session = data.session;
        if (session.direction === "incoming") {
          const id = `w${this.nextId++}`;
          const remote = session.remote_identity?.uri?.toString?.() || "unknown";
          this.wireCall(session, id, "incoming", remote);
        }
      });
      this.ua.start();
    } catch (e: any) {
      this.setStatus("error");
      this.log("error", "WebRTC connect failed", { message: e?.message });
    }
  }

  async disconnect(): Promise<void> {
    try {
      this.sessions.forEach((s) => { try { s.terminate(); } catch { /* ignore */ } });
      this.sessions.clear();
      if (this.ua) { try { this.ua.unregister(); } catch { /* ignore */ } this.ua.stop(); }
    } catch { /* ignore */ }
    this.ua = null;
    this.calls.clear();
    this.setStatus("disconnected");
  }

  /** Reconcile + recover the WSS registration (foreground / network return). */
  async reconcile(): Promise<void> {
    if (!this.config) return;
    if (!isNativeUp(this.getNativeRegState())) await this.connect(this.config);
    else this.setStatus(regToStatus(this.getNativeRegState()));
  }

  async call(target: string): Promise<string | null> {
    if (!isWebrtcAvailable() || !this.config) return null;
    if (!canPlaceCall(this.getNativeRegState())) {
      // Try to (re)register before giving up.
      await this.connect(this.config);
      const t0 = Date.now();
      while (Date.now() - t0 < 5000 && !canPlaceCall(this.getNativeRegState())) {
        await new Promise((r) => setTimeout(r, 250));
      }
      if (!canPlaceCall(this.getNativeRegState())) { this.log("error", "WebRTC call aborted: not registered"); return null; }
    }
    try {
      const uri = target.startsWith("sip:") ? target : `sip:${target}@${this.config.domain}`;
      const id = `w${this.nextId++}`;
      const session = this.ua.call(uri, {
        mediaConstraints: { audio: true, video: false },
        rtcOfferConstraints: { offerToReceiveAudio: true, offerToReceiveVideo: false },
      });
      this.wireCall(session, id, "outgoing", uri);
      return id;
    } catch (e: any) {
      this.log("error", "WebRTC makeCall failed", { message: e?.message });
      return null;
    }
  }

  answer(id: string) {
    const s = this.sessions.get(id);
    try { s?.answer({ mediaConstraints: { audio: true, video: false } }); } catch (e: any) { this.log("error", "answer failed", e); }
  }
  hangup(id?: string) {
    const target = id ?? this.getActiveCall()?.id;
    if (!target) return;
    try { this.sessions.get(target)?.terminate(); } catch (e: any) { this.log("error", "hangup failed", e); }
  }
  setMute(id: string, muted: boolean) {
    const s = this.sessions.get(id);
    try { if (muted) s?.mute({ audio: true }); else s?.unmute({ audio: true }); } catch { /* ignore */ }
    const c = this.calls.get(id); if (c) { c.muted = muted; this.calls.set(id, c); this.notify(); }
  }
  setSpeaker(_enabled: boolean) { /* routed by the OS / InCallManager on the WebRTC path */ }
  sendDTMF(id: string, tone: string) {
    try { this.sessions.get(id)?.sendDTMF(tone); } catch (e: any) { this.log("error", "dtmf failed", e); }
  }
  setHold(id: string, hold: boolean) {
    const s = this.sessions.get(id);
    try { if (hold) s?.hold(); else s?.unhold(); } catch (e: any) { this.log("error", "hold failed", e); }
  }
  async setHoldWithLocalMoh(): Promise<{ ok: boolean; reason?: string }> { return { ok: false, reason: "not_supported_webrtc" }; }
  async resumeFromLocalMoh(): Promise<void> { /* n/a on WebRTC */ }
  isLocalMohActive(): boolean { return false; }
  transfer(id: string, target: string): boolean {
    const s = this.sessions.get(id);
    try {
      const uri = target.startsWith("sip:") ? target : `sip:${target}@${this.config?.domain}`;
      s?.refer(uri); // blind transfer (SIP REFER)
      return true;
    } catch (e: any) { this.log("error", "transfer failed", e); return false; }
  }
}
