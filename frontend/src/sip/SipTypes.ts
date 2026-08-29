// Shared SIP types. The calling engine is NativeSipEngine (PJSIP / SIP over UDP).
// (Extracted from the former JsSIP SipEngine, which has been removed.)

export type SipConfig = {
  displayName: string;
  username: string; // SIP auth username (the extension / endpoint)
  password: string;
  domain: string; // e.g. dialer.depthroute.com
  registerExpires?: number;
  // Native SIP/UDP fields (from GET /api/app/sip-config.php).
  server?: string; // registrar host (defaults to domain)
  port?: number; // 5060 for UDP
  transport?: "UDP" | "TCP" | "TLS";
  outboundProxy?: string | null;
  authUsername?: string;
  // Legacy field kept for the SipAccount shape; unused on the native path.
  wssUrl?: string;
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
  remote: string; // sip:user@host or tel number
  remoteName?: string;
  state: CallState;
  startedAt?: number; // ms when connected
  endedAt?: number;
  durationSec: number;
  muted: boolean;
  onHold: boolean;
  cause?: string; // failure cause
};

export type SipLogLevel = "info" | "warn" | "error" | "debug";
export type SipLogEntry = { ts: number; level: SipLogLevel; msg: string; data?: any };
