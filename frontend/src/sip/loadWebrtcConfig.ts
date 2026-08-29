// Loads the authenticated customer's WebRTC (SIP-over-WSS) identity from the
// WebDialer backend (GET /backend/api/app/webrtc-config.php). Token only — the
// backend resolves uid -> pkg_extension -> browser webrtc credential server-side.
// This is a SEPARATE identity from the UDP one (endpoint name + webrtc_secret,
// its own AOR), so mobile WebRTC can coexist with the UDP line and the browser.
//
// NEVER hardcodes usernames/passwords/extensions; everything comes from the API.

import { apiGet } from "@/src/api";

export type WebrtcConfigResponse = {
  enabled: boolean;
  ws_url: string;
  websocket?: string;
  sip_uri: string;
  domain: string;
  realm: string;
  username: string; // the WebRTC endpoint name (NOT the UDP extension number)
  password: string; // the endpoint's OWN webrtc_secret
  credential?: string;
  extension: { id: number; extension: string; name: string; device_type: string };
};

export type WebrtcAccount = {
  wsUrl: string;
  sipUri: string;
  domain: string;
  username: string; // webrtc endpoint identity
  password: string;
  extension: string; // the human extension number (for display)
  displayName: string;
  deviceType: string; // 'web' | 'both'
};

/** Fetch the WebRTC config and map it to a registrable WebRTC account. */
export async function loadWebrtcAccountFromBackend(): Promise<WebrtcAccount> {
  const c = await apiGet<WebrtcConfigResponse>("/webrtc-config"); // -> /backend/api/app/webrtc-config.php
  return {
    wsUrl: c.ws_url || c.websocket || "",
    sipUri: c.sip_uri,
    domain: c.domain || c.realm,
    username: c.username,
    password: c.password || c.credential || "",
    extension: c.extension?.extension || "",
    displayName: c.extension?.name || c.username,
    deviceType: c.extension?.device_type || "",
  };
}
