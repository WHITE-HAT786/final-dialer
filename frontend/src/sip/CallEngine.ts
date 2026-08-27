// CallEngine — the transport-agnostic contract the dialer UI talks to.
//
// The app supports TWO legitimate calling paths and neither replaces the other:
//
//   NativeSipEngine   -> expo-pjsip -> PJSIP -> SIP/UDP -> Asterisk -> PSTN
//   WebRtcCallEngine  -> SIP over WSS        -> Asterisk -> PSTN
//
// The UI must not care which one is active; it uses this interface and reads
// `transport` for diagnostics only.
import type { CallInfo, SipConfig, SipStatus } from "./SipTypes";

export type CallTransport = "UDP" | "WEBRTC";

/** What the user (or config) asked for. AUTO resolves at connect time. */
export type TransportPreference = "UDP" | "WEBRTC" | "AUTO";

/** Why a transport is or is not usable — surfaced in diagnostics, never faked. */
export type TransportAvailability = {
  transport: CallTransport;
  available: boolean;
  /** Machine-readable reason when unavailable, e.g. "NO_NATIVE_MODULE". */
  reason?: string;
  /** Human-readable detail for the diagnostics screen. */
  detail?: string;
};

export interface CallEngine {
  readonly transport: CallTransport;

  /** Is this engine usable on this device/build at all? */
  isSupported(): boolean;
  /** Richer form of isSupported() for diagnostics. */
  availability(): TransportAvailability;

  initialize(config: SipConfig): void | Promise<void>;
  connect(): void | Promise<void>;
  disconnect(): void | Promise<void>;

  makeCall(target: string): void | Promise<void>;
  answer(id: string): void | Promise<void>;
  reject(id: string): void | Promise<void>;
  hangup(id?: string): void | Promise<void>;

  sendDTMF(id: string, tone: string): void | Promise<void>;
  setMute(id: string, muted: boolean): void | Promise<void>;
  setSpeaker(enabled: boolean): void | Promise<void>;

  getStatus(): SipStatus;
  getCalls(): CallInfo[];
  getActiveCall(): CallInfo | null;
  getConfig(): SipConfig | null;
}
