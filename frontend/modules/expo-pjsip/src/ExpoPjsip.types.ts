// Bridge types between JS and the native PJSIP/pjsua2 module.
// SIP transport is UDP by default. This is telephony only — it never sees the
// wallet, portal, or any HTTPS API credential.

export type PjsipTransport = "UDP" | "TCP" | "TLS";

// The minimum a native register needs. Sourced ONLY from GET /api/app/sip-config.php.
export type PjsipConfig = {
  server: string; // registrar / SIP domain (Asterisk)
  port: number; // 5060 for UDP
  transport: PjsipTransport;
  username: string; // pkg_extension.endpoint
  authUsername?: string;
  password: string; // the customer's OWN device credential
  domain: string;
  outboundProxy?: string | null; // helps symmetric-RTP / NAT
  registerExpires?: number;
  displayName?: string;
};

export type PjsipRegState =
  | "initializing"
  | "registering"
  | "registered"
  | "unregistering"
  | "unregistered"
  | "failed"
  | "offline";

export type PjsipCallState =
  | "idle"
  | "dialing"
  | "ringing"
  | "early"
  | "connecting"
  | "connected"
  | "held"
  | "ended"
  | "failed";

// Native → JS events. The native side emits these; the UI never touches raw PJSIP.
export type PjsipEvents = {
  onRegState: (e: { state: PjsipRegState; code?: number; reason?: string }) => void;
  onIncomingCall: (e: { callId: string; remote: string; remoteName?: string }) => void;
  onCallState: (e: {
    callId: string;
    state: PjsipCallState;
    code?: number;
    cause?: string;
    direction?: "incoming" | "outgoing";
  }) => void;
  onDtmf: (e: { callId: string; digit: string }) => void;
  onAudioState: (e: { callId: string; active: boolean }) => void;
  onError: (e: { code: string; message: string }) => void;
};
