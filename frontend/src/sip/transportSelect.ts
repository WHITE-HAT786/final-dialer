// Transport selection for the dialer.
//
// Rules (Phase 9):
//   UDP     -> use SIP/UDP only
//   WEBRTC  -> use SIP-over-WSS only
//   AUTO    -> prefer UDP when it is genuinely usable, else WebRTC, else none
//
// Selection NEVER substitutes another customer's account, never falls back to
// hardcoded credentials, and never invents availability: it only reads the
// availability each engine reports.
import type { CallTransport, TransportAvailability, TransportPreference } from "./CallEngine";

export type TransportDecision = {
  /** null means no transport can carry a call right now. */
  selected: CallTransport | null;
  /** Diagnostics string, e.g. "Calling transport: SIP/UDP". */
  label: string;
  reason?: string;
  considered: TransportAvailability[];
};

export function transportLabel(t: CallTransport | null): string {
  if (t === "UDP") return "Calling transport: SIP/UDP";
  if (t === "WEBRTC") return "Calling transport: WebRTC";
  return "Calling unavailable";
}

export function selectTransport(
  preference: TransportPreference,
  udp: TransportAvailability,
  webrtc: TransportAvailability,
): TransportDecision {
  const considered = [udp, webrtc];

  if (preference === "UDP") {
    const ok = udp.available;
    return {
      selected: ok ? "UDP" : null,
      label: transportLabel(ok ? "UDP" : null),
      reason: ok ? undefined : udp.reason ?? "UDP_UNAVAILABLE",
      considered,
    };
  }

  if (preference === "WEBRTC") {
    const ok = webrtc.available;
    return {
      selected: ok ? "WEBRTC" : null,
      label: transportLabel(ok ? "WEBRTC" : null),
      reason: ok ? undefined : webrtc.reason ?? "WEBRTC_UNAVAILABLE",
      considered,
    };
  }

  // AUTO: UDP is the preferred native transport when it is actually usable.
  if (udp.available) {
    return { selected: "UDP", label: transportLabel("UDP"), considered };
  }
  if (webrtc.available) {
    return { selected: "WEBRTC", label: transportLabel("WEBRTC"), considered };
  }
  return {
    selected: null,
    label: transportLabel(null),
    reason: udp.reason ?? webrtc.reason ?? "NO_TRANSPORT",
    considered,
  };
}
