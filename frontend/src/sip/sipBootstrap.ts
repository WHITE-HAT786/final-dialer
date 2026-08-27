// Pure, dependency-free helpers for the SIP/UDP account bootstrap lifecycle.
//
// This module deliberately imports NOTHING at runtime (only a type from
// SipTypes, which is erased) so the bootstrap logic can be unit-tested in
// isolation, without React, native modules, or the network.
//
// Flow it supports:
//   authenticated -> GET /sip-config.php -> mapSipConfig() -> register via
//   NativeSipEngine.  Failures are classified into explicit, user-safe states.

import type { SipStatus } from "./SipTypes";

/** The states the SIP bootstrap can be in, surfaced to the UI. */
export type SipBootstrapState =
  | "idle" // not authenticated / not started
  | "loading" // fetching /sip-config.php
  | "registering" // config loaded, engine attempting REGISTER
  | "registered" // REGISTER 200 (only genuinely true on a real device)
  | "unregistered" // was registered / now not
  | "registration_failed" // REGISTER rejected (e.g. 401/403 from Asterisk)
  | "no_extension" // backend: the account has no enabled extension
  | "needs_provision" // backend: extension exists but isn't provisioned
  | "unavailable" // network/timeout/503 — transient, retryable
  | "unsupported" // native PJSIP module not present (Expo Go / web / no .so)
  | "error"; // 401/malformed/other — needs sign-in or support

/** Backend /sip-config.php success payload (customer's OWN device extension). */
export type SipConfigResponse = {
  transport?: "UDP" | "TCP" | "TLS";
  server?: string;
  domain?: string;
  port?: number;
  username?: string;
  auth_username?: string;
  password?: string;
  outbound_proxy?: string | null;
  register_expires?: number;
  extension?: { id: number; extension: string; name: string; device_type: string };
};

/** The SipAccount fields we build from the backend (id/color assigned later). */
export type SipConfigAccount = {
  displayName: string;
  username: string;
  authUser: string;
  password: string;
  domain: string;
  host: string;
  port: number;
  transport: "UDP" | "TCP" | "TLS";
  outboundProxy: string | null;
  registerExpires?: number;
  callerId: string;
  enabled: boolean;
};

/** Minimal shape read off a thrown error (duck-typed so tests need no ApiError). */
export type ErrLike = { status?: number; code?: string; message?: string };

export type BootstrapOutcome = { state: SipBootstrapState; message?: string };

/**
 * Map the backend SIP config to a registrable account. Never invents values;
 * only the authenticated customer's own extension creds arrive here. The client
 * sent nothing but its bearer token — uid -> extension is resolved server-side.
 */
export function mapSipConfig(c: SipConfigResponse): SipConfigAccount {
  return {
    displayName: c.extension?.name || c.username || "My Line",
    username: c.username || "",
    authUser: c.auth_username || c.username || "",
    password: c.password || "",
    domain: c.domain || c.server || "",
    host: c.server || c.domain || "",
    port: c.port || 5060,
    transport: c.transport || "UDP",
    outboundProxy: c.outbound_proxy ?? null,
    registerExpires: c.register_expires,
    callerId: "",
    enabled: true,
  };
}

/** A config is registrable only with host + username + password (UDP identity). */
export function isRegistrableConfig(
  c: { username?: string; password?: string; host?: string; domain?: string } | null | undefined,
): boolean {
  return !!(c && c.username && c.password && (c.host || c.domain));
}

/**
 * Turn a thrown error from the /sip-config load into an explicit bootstrap state
 * plus a user-safe message (never the raw backend error, never a credential).
 */
export function classifyBootstrapError(e: unknown): BootstrapOutcome {
  const err = (e || {}) as ErrLike;
  const code = err.code;
  const status = err.status;
  if (code === "NO_EXTENSION")
    return { state: "no_extension", message: "No calling extension is assigned to your account yet." };
  if (code === "NEEDS_PROVISION")
    return { state: "needs_provision", message: "Your calling line isn’t provisioned yet." };
  if (status === 401 || code === "UNAUTHORIZED")
    return { state: "error", message: "Your session expired — please sign in again." };
  if (status === 403 || code === "FORBIDDEN")
    return { state: "error", message: "You don’t have access to a calling line." };
  if (code === "NO_BACKEND_URL")
    return { state: "error", message: "The app isn’t configured to reach the server." };
  if (status === 0 || status === 503 || code === "NETWORK" || code === "TIMEOUT")
    return { state: "unavailable", message: "SIP service is temporarily unavailable." };
  return { state: "error", message: err.message || "Could not load your SIP configuration." };
}

/** Reflect the native engine's registration status into a bootstrap state. */
export function mapEngineStatus(s: SipStatus): SipBootstrapState {
  switch (s) {
    case "connecting":
      return "registering";
    case "registered":
      return "registered";
    case "unregistered":
    case "disconnected":
      return "unregistered";
    case "registration_failed":
      return "registration_failed";
    case "unsupported":
      return "unsupported";
    case "error":
    default:
      return "error";
  }
}

/** States a manual "retry" is meaningful for (no automatic retry loops). */
const RETRYABLE: SipBootstrapState[] = [
  "no_extension",
  "needs_provision",
  "unavailable",
  "registration_failed",
  "unregistered",
  "error",
];

export function isRetryable(state: SipBootstrapState): boolean {
  return RETRYABLE.includes(state);
}

/** Short, user-facing label. Never exposes a credential or raw backend error. */
export function sipBootstrapLabel(state: SipBootstrapState): string {
  switch (state) {
    case "idle":
      return "Not connected";
    case "loading":
      return "Connecting…";
    case "registering":
      return "Registering…";
    case "registered":
      return "Registered";
    case "unregistered":
      return "Unregistered";
    case "registration_failed":
      return "Registration failed";
    case "no_extension":
      return "No extension";
    case "needs_provision":
      return "Not provisioned";
    case "unavailable":
      return "SIP unavailable";
    case "unsupported":
      return "Calling unavailable in this build";
    case "error":
      return "SIP error";
  }
}

/** Belt-and-braces: redact the password before anything is logged. */
export function redactAccount<T extends { password?: string }>(a: T): Omit<T, "password"> & { password: string } {
  return { ...a, password: a.password ? "***" : "" };
}
