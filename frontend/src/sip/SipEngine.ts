// Depth Route Dialer — SIP Engine (JsSIP)
// Works in:
//  - Web preview: uses browser's native RTCPeerConnection.
//  - Expo Go: no RTCPeerConnection available → engine stays in "unsupported" state
//    (no crash, users still see UI). Real calls require an EAS native build with
//    `react-native-webrtc` + `registerGlobals()`.
//  - EAS native build with react-native-webrtc: works fully.
import JsSIP from "jssip";
import type { RTCSession } from "jssip/lib/RTCSession";
import { Platform } from "react-native";

// Suppress noisy default logs; we route everything via our own logger.
JsSIP.debug.disable();

export type SipConfig = {
  displayName: string;
  username: string;      // SIP auth username (usually the extension / trunk user)
  password: string;
  domain: string;        // e.g. sip.depthroute.com
  wssUrl: string;        // e.g. wss://sip.depthroute.com:8089/ws
  registerExpires?: number;
  iceServers?: RTCIceServer[];
};

export type SipStatus =
  | "unsupported"
  | "disconnected"
  | "connecting"
  | "registered"
  | "unregistered"
  | "registration_failed"
  | "error";

export type CallDirection = "outgoing" | "incoming";
export type CallState =
  | "idle"
  | "dialing"
  | "ringing"
  | "connecting"
  | "connected"
  | "held"
  | "ended"
  | "failed";

export type CallInfo = {
  id: string;
  direction: CallDirection;
  remote: string;         // sip:user@host or tel number
  remoteName?: string;
  state: CallState;
  startedAt?: number;     // ms when connected
  endedAt?: number;
  durationSec: number;
  muted: boolean;
  onHold: boolean;
  cause?: string;         // failure cause
};

export type SipLogLevel = "info" | "warn" | "error" | "debug";
export type SipLogEntry = { ts: number; level: SipLogLevel; msg: string; data?: any };

type Listener = () => void;

const DEFAULT_ICE: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:global.stun.twilio.com:3478" },
];

const isWebRtcAvailable =
  typeof globalThis !== "undefined" &&
  // @ts-ignore
  typeof (globalThis as any).RTCPeerConnection !== "undefined";

function newId() {
  return `call_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export class SipEngine {
  private ua: JsSIP.UA | null = null;
  private config: SipConfig | null = null;
  private status: SipStatus = "disconnected";
  private calls: Map<string, { info: CallInfo; session: RTCSession }> = new Map();
  private logs: SipLogEntry[] = [];
  private listeners = new Set<Listener>();
  private audioElement: HTMLAudioElement | null = null;
  private timers: Map<string, any> = new Map();

  constructor() {
    if (!isWebRtcAvailable) {
      this.status = "unsupported";
      this.log("warn", "WebRTC not available on this runtime. Real SIP calling disabled.");
    }
  }

  // -------------------- observable --------------------
  subscribe(l: Listener) {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }
  private emit() {
    this.listeners.forEach((l) => {
      try { l(); } catch {}
    });
  }
  private log(level: SipLogLevel, msg: string, data?: any) {
    const entry: SipLogEntry = { ts: Date.now(), level, msg, data };
    this.logs.push(entry);
    if (this.logs.length > 300) this.logs.shift();
    // eslint-disable-next-line no-console
    console.log(`[SIP:${level}] ${msg}`, data ?? "");
    this.emit();
  }

  // -------------------- getters --------------------
  getStatus(): SipStatus { return this.status; }
  getConfig(): SipConfig | null { return this.config; }
  getCalls(): CallInfo[] { return Array.from(this.calls.values()).map((c) => ({ ...c.info })); }
  getActiveCall(): CallInfo | null {
    const active = Array.from(this.calls.values()).find(
      (c) => !["ended", "failed"].includes(c.info.state),
    );
    return active ? { ...active.info } : null;
  }
  getLogs(): SipLogEntry[] { return this.logs.slice().reverse(); }
  isSupported() { return isWebRtcAvailable; }

  // -------------------- connect --------------------
  async connect(cfg: SipConfig) {
    if (!isWebRtcAvailable) {
      this.status = "unsupported";
      this.log("error", "Cannot connect: WebRTC missing. Use a browser preview or an EAS native build with react-native-webrtc.");
      this.emit();
      return;
    }
    if (this.ua) await this.disconnect();
    this.config = cfg;

    // Prepare remote audio sink on web only
    if (Platform.OS === "web" && typeof document !== "undefined") {
      let a = document.getElementById("__depthroute_audio") as HTMLAudioElement | null;
      if (!a) {
        a = document.createElement("audio");
        a.id = "__depthroute_audio";
        a.autoplay = true;
        (a as any).playsInline = true;
        document.body.appendChild(a);
      }
      this.audioElement = a;
    }

    const socket = new JsSIP.WebSocketInterface(cfg.wssUrl);
    const uri = `sip:${cfg.username}@${cfg.domain}`;

    const ua = new JsSIP.UA({
      sockets: [socket],
      uri,
      password: cfg.password,
      display_name: cfg.displayName || cfg.username,
      register: true,
      register_expires: cfg.registerExpires ?? 300,
      user_agent: "DepthRouteDialer/1.0",
      session_timers: false,
    });

    ua.on("connecting", () => {
      this.status = "connecting";
      this.log("info", `Connecting to ${cfg.wssUrl}`);
      this.emit();
    });
    ua.on("connected", () => this.log("info", "WebSocket connected"));
    ua.on("disconnected", (e: any) => {
      this.status = "disconnected";
      this.log("warn", "WebSocket disconnected", { code: e?.code, reason: e?.reason });
      this.emit();
    });
    ua.on("registered", () => {
      this.status = "registered";
      this.log("info", `Registered as ${uri}`);
      this.emit();
    });
    ua.on("unregistered", () => {
      this.status = "unregistered";
      this.log("info", "Unregistered");
      this.emit();
    });
    ua.on("registrationFailed", (e: any) => {
      this.status = "registration_failed";
      this.log("error", `Registration failed: ${e?.cause || "unknown"}`, e?.response?.status_code ? { code: e.response.status_code } : undefined);
      this.emit();
    });

    ua.on("newRTCSession", (data: any) => {
      const session: RTCSession = data.session;
      const dir: CallDirection = session.direction === "incoming" ? "incoming" : "outgoing";
      const id = newId();
      const remote = session.remote_identity?.uri?.toString() || "sip:unknown";
      const remoteName = session.remote_identity?.display_name || undefined;
      const info: CallInfo = {
        id,
        direction: dir,
        remote,
        remoteName,
        state: dir === "incoming" ? "ringing" : "dialing",
        durationSec: 0,
        muted: false,
        onHold: false,
      };
      this.calls.set(id, { info, session });
      this.log("info", `New ${dir} call: ${remoteName || remote}`);
      this.emit();

      const finish = (state: CallState, cause?: string) => {
        const entry = this.calls.get(id);
        if (!entry) return;
        entry.info.state = state;
        entry.info.endedAt = Date.now();
        if (cause) entry.info.cause = cause;
        this.stopTimer(id);
        this.log(state === "ended" ? "info" : "warn", `Call ${state}${cause ? ": " + cause : ""}`);
        this.emit();
        // GC after 3s
        setTimeout(() => {
          this.calls.delete(id);
          this.emit();
        }, 3000);
      };

      session.on("progress", () => {
        const entry = this.calls.get(id);
        if (!entry) return;
        entry.info.state = "ringing";
        this.log("info", "Ringing…");
        this.emit();
      });
      session.on("accepted", () => {
        const entry = this.calls.get(id);
        if (!entry) return;
        entry.info.state = "connected";
        entry.info.startedAt = Date.now();
        this.startTimer(id);
        this.log("info", "Call connected");
        this.emit();
      });
      session.on("confirmed", () => {});
      session.on("ended", (e: any) => finish("ended", e?.cause));
      session.on("failed", (e: any) => finish("failed", e?.cause || "failed"));

      // Attach remote media (web only). On native (react-native-webrtc) the stream is auto-played by RTCView.
      const attachRemote = () => {
        if (!this.audioElement) return;
        try {
          const pc: RTCPeerConnection | undefined = (session as any).connection;
          if (!pc) return;
          const remoteStream = new (globalThis as any).MediaStream();
          pc.getReceivers().forEach((r: RTCRtpReceiver) => {
            if (r.track) remoteStream.addTrack(r.track);
          });
          this.audioElement.srcObject = remoteStream;
          this.audioElement.play?.().catch(() => {});
        } catch (e: any) {
          this.log("warn", "attachRemote failed", { err: String(e) });
        }
      };
      session.on("peerconnection", () => setTimeout(attachRemote, 100));
      session.on("accepted", attachRemote);
    });

    try {
      ua.start();
      this.ua = ua;
      this.log("info", "SIP UA started");
    } catch (e: any) {
      this.status = "error";
      this.log("error", "UA start failed", { err: String(e) });
      this.emit();
    }
  }

  async disconnect() {
    if (this.ua) {
      try { this.ua.stop(); } catch {}
      this.ua = null;
    }
    this.status = isWebRtcAvailable ? "disconnected" : "unsupported";
    this.log("info", "Disconnected");
    this.emit();
  }

  // -------------------- calls --------------------
  private startTimer(id: string) {
    this.stopTimer(id);
    const t = setInterval(() => {
      const entry = this.calls.get(id);
      if (!entry || !entry.info.startedAt) return;
      entry.info.durationSec = Math.floor((Date.now() - entry.info.startedAt) / 1000);
      this.emit();
    }, 1000);
    this.timers.set(id, t);
  }
  private stopTimer(id: string) {
    const t = this.timers.get(id);
    if (t) { clearInterval(t); this.timers.delete(id); }
  }

  async call(target: string): Promise<string | null> {
    if (!this.ua || this.status !== "registered") {
      this.log("warn", "Cannot place call — not registered");
      return null;
    }
    if (!this.config) return null;
    const dest = target.includes("@")
      ? (target.startsWith("sip:") ? target : `sip:${target}`)
      : `sip:${target}@${this.config.domain}`;
    try {
      const pcConfig: RTCConfiguration = { iceServers: this.config.iceServers || DEFAULT_ICE };
      this.ua.call(dest, {
        mediaConstraints: { audio: true, video: false },
        pcConfig,
        rtcOfferConstraints: { offerToReceiveAudio: true, offerToReceiveVideo: false } as any,
      });
      this.log("info", `Calling ${dest}`);
      // The id is created inside newRTCSession; return latest outgoing call id after a tick
      await new Promise((r) => setTimeout(r, 30));
      const latest = Array.from(this.calls.values())
        .filter((c) => c.info.direction === "outgoing")
        .pop();
      return latest?.info.id || null;
    } catch (e: any) {
      this.log("error", "call() failed", { err: String(e) });
      return null;
    }
  }

  answer(id: string) {
    const c = this.calls.get(id);
    if (!c) return;
    try {
      c.session.answer({
        mediaConstraints: { audio: true, video: false },
        pcConfig: { iceServers: this.config?.iceServers || DEFAULT_ICE },
      });
      this.log("info", "Call answered");
    } catch (e: any) {
      this.log("error", "answer failed", { err: String(e) });
    }
  }

  hangup(id?: string) {
    if (id) {
      const c = this.calls.get(id);
      if (c) { try { c.session.terminate(); } catch {} }
      return;
    }
    // hang up the newest active call
    for (const [key, c] of Array.from(this.calls.entries()).reverse()) {
      if (!["ended", "failed"].includes(c.info.state)) {
        try { c.session.terminate(); } catch {}
        return;
      }
    }
  }

  setMute(id: string, muted: boolean) {
    const c = this.calls.get(id);
    if (!c) return;
    try {
      if (muted) c.session.mute({ audio: true });
      else c.session.unmute({ audio: true });
      c.info.muted = muted;
      this.log("info", `Mute: ${muted}`);
      this.emit();
    } catch {}
  }

  setHold(id: string, hold: boolean) {
    const c = this.calls.get(id);
    if (!c) return;
    try {
      if (hold) c.session.hold();
      else c.session.unhold();
      c.info.onHold = hold;
      c.info.state = hold ? "held" : "connected";
      this.log("info", `Hold: ${hold}`);
      this.emit();
    } catch {}
  }

  sendDTMF(id: string, tone: string) {
    const c = this.calls.get(id);
    if (!c) return;
    try {
      c.session.sendDTMF(tone);
      this.log("info", `DTMF ${tone}`);
    } catch {}
  }
}

export const sipEngineInstance = new SipEngine(); // legacy single-account fallback
