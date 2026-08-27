// Loads the authenticated customer's NATIVE SIP/UDP account from the WebDialer
// backend and turns it into a registrable account for the MultiSipContext.
//
// The client sends NOTHING except its bearer token — the backend resolves
// uid -> pkg_extension -> credentials server-side. There is no uid / account_id
// / extension parameter here by design, and no provider trunk (pkg_sip) creds.
//
// The pure mapping + error classification live in ./sipBootstrap so they can be
// unit-tested without the network. This module is just the authenticated fetch.

import { apiGet } from "@/src/api";
import { mapSipConfig, SipConfigAccount, SipConfigResponse } from "./sipBootstrap";

export type { SipConfigAccount, SipConfigResponse };

/**
 * Fetch GET /backend/api/app/sip-config.php and map it to a registrable account.
 * Throws the typed ApiError from apiGet on failure (NO_EXTENSION / NEEDS_PROVISION
 * / 401 / network); callers classify it via classifyBootstrapError().
 */
export async function loadSipAccountFromBackend(): Promise<SipConfigAccount> {
  const c = await apiGet<SipConfigResponse>("/sip-config"); // -> /backend/api/app/sip-config.php
  return mapSipConfig(c);
}
