// WebRtcCallEngine — the SIP-over-WSS calling path.
//
// The WebDialer backend genuinely supports this path: GET
// /backend/api/app/webrtc-config.php returns ws_url / sip_uri / username /
// password (the extension's OWN webrtc_secret, uid-scoped server-side).
//
// The React Native client stack for it (a WebRTC peer connection plus a SIP-
// over-WebSocket signaller) is NOT bundled in this build. Rather than ship a
// pretend implementation that reports success without placing a call, this
// engine reports its real availability and refuses to act when unsupported.
//
// To make this path live, three things are required and none may be faked:
//   1. a WebRTC + SIP/WSS client stack in the app,
//   2. a browser-capable extension (device_type 'web' or 'both') provisioned
//      with a webrtc_secret, and
//   3. an Asterisk WebSocket listener for the target environment.
import type { CallEngine, CallTransport, TransportAvailability } from "./CallEngine";
import type { CallInfo, SipConfig, SipStatus } from "./SipTypes";

/** True only when a real WebRTC peer-connection stack is present at runtime. */
export function isWebRtcStackAvailable(): boolean {
  return typeof (globalThis as any).RTCPeerConnection !== "undefined";
}

const UNSUPPORTED = "WebRTC calling is not available in this build.";

export class WebRtcCallEngine implements CallEngine {
  readonly transport: CallTransport = "WEBRTC";
  private config: SipConfig | null = null;

  isSupported(): boolean {
    return isWebRtcStackAvailable();
  }

  availability(): TransportAvailability {
    if (!isWebRtcStackAvailable()) {
      return {
        transport: "WEBRTC",
        available: false,
        reason: "NO_WEBRTC_STACK",
        detail: "No WebRTC peer-connection stack is bundled in this build.",
      };
    }
    if (!this.config) {
      return {
        transport: "WEBRTC",
        available: false,
        reason: "NO_CONFIG",
        detail: "No browser SIP identity has been loaded from webrtc-config.",
      };
    }
    return { transport: "WEBRTC", available: true };
  }

  initialize(config: SipConfig) { this.config = config; }

  connect() { throw new Error(UNSUPPORTED); }
  disconnect() { this.config = null; }

  makeCall(_target: string) { throw new Error(UNSUPPORTED); }
  answer(_id: string) { throw new Error(UNSUPPORTED); }
  reject(_id: string) { throw new Error(UNSUPPORTED); }
  hangup(_id?: string) { /* nothing can be in progress */ }

  sendDTMF(_id: string, _tone: string) { throw new Error(UNSUPPORTED); }
  setMute(_id: string, _muted: boolean) { throw new Error(UNSUPPORTED); }
  setSpeaker(_enabled: boolean) { /* no active media */ }

  getStatus(): SipStatus { return "offline" as SipStatus; }
  getCalls(): CallInfo[] { return []; }
  getActiveCall(): CallInfo | null { return null; }
  getConfig(): SipConfig | null { return this.config; }
}
