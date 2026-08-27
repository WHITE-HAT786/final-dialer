// Loads the authenticated customer's NATIVE SIP/UDP account from the WebDialer
// backend and turns it into a SipAccount the MultiSipContext can register.
//
// The client sends NOTHING except its bearer token — the backend resolves
// uid -> pkg_extension -> credentials server-side. There is no uid / account_id
// / extension parameter here by design.

import { apiGet } from "@/src/api";
import { SipAccount } from "./MultiSipContext";

export type SipConfigResponse = {
  transport: "UDP" | "TCP" | "TLS";
  server: string;
  domain: string;
  port: number;
  username: string;
  auth_username?: string;
  password: string;
  outbound_proxy?: string | null;
  register_expires?: number;
  extension: { id: number; extension: string; name: string; device_type: string };
};

export class SipProvisionError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = "SipProvisionError";
  }
}

/**
 * Fetch the SIP config and map it to a SipAccount (id/color assigned by the
 * context when added). Throws SipProvisionError('NEEDS_PROVISION') etc. so the
 * UI can show the right message instead of a blank/failed registration.
 */
export async function loadSipAccountFromBackend(): Promise<Omit<SipAccount, "id" | "color">> {
  const c = await apiGet<SipConfigResponse>("/sip-config"); // -> /backend/api/app/sip-config.php
  return {
    displayName: c.extension?.name || c.username,
    username: c.username,
    authUser: c.auth_username || c.username,
    password: c.password,
    domain: c.domain || c.server,
    host: c.server,
    port: c.port || 5060,
    transport: c.transport || "UDP",
    outboundProxy: c.outbound_proxy ?? null,
    callerId: "",
    enabled: true,
  };
}
