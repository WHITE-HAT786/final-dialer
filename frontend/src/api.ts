import { storage } from "@/src/utils/storage";
import { Platform } from "react-native";
import {
  ApiError,
  AuthUser,
  LoginResult,
  WalletBalanceState,
  WalletTransaction,
} from "@/src/types";

// ---------------------------------------------------------------------------
// Base URL. EXPO_PUBLIC_BACKEND_URL points at the WebDialer origin (e.g.
// https://staging.example.com). The app calls the real WebDialer endpoints
// directly under /backend/... — there is no separate/mock backend.
//
// Only the ORIGIN is a public client var. HMAC secrets, the portal account
// mapping, API keys and DB credentials are SERVER-ONLY and never shipped here.
// ---------------------------------------------------------------------------
const BASE = (process.env.EXPO_PUBLIC_BACKEND_URL || "").replace(/\/+$/, "");
export const APP_API = `${BASE}/backend/api/app`;
export const AUTH_KEY = "auth_token";

async function authHeaders(): Promise<Record<string, string>> {
  const token = await storage.secureGet<string>(AUTH_KEY, "");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Friendly, user-facing text for a backend status. Never turned into success. */
function friendly(status: number, code: string, message: string): string {
  if (message) return message;
  switch (status) {
    case 401: return "Please sign in again.";
    case 403: return "You don't have permission to do that.";
    case 404: return "Not found.";
    case 409: return "That request conflicts with the current state.";
    case 422: return "Please check the details and try again.";
    case 429: return "Too many requests — slow down and retry.";
    case 503: return "The service is temporarily unavailable.";
    default:  return status >= 500 ? "Something went wrong on the server." : `Request failed (${status}).`;
  }
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 20000): Promise<Response> {
  if (!BASE) {
    throw new ApiError(0, "NO_BACKEND_URL",
      "Backend URL is not configured (EXPO_PUBLIC_BACKEND_URL is empty).");
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (e: any) {
    const isAbort = e?.name === "AbortError";
    const short = isAbort
      ? `Server timed out after ${Math.round(timeoutMs / 1000)}s`
      : "Cannot reach server";
    throw new ApiError(0, isAbort ? "TIMEOUT" : "NETWORK",
      `${short} (${Platform.OS}) ${url}${e?.message ? " — " + e.message : ""}`);
  } finally {
    clearTimeout(timer);
  }
}

/** Unwrap the WebDialer envelope: return `data`, or throw a typed ApiError. */
async function unwrap<T>(res: Response): Promise<T> {
  let body: any = {};
  try { body = await res.json(); } catch { /* empty/invalid body */ }
  if (!res.ok || body?.success === false) {
    const code = body?.error || `HTTP_${res.status}`;
    // Some endpoints (e.g. signup) report which inputs were wrong.
    const fields = body?.data && !Array.isArray(body.data) && typeof body.data === "object"
      ? (body.data as Record<string, string[]>)
      : undefined;
    throw new ApiError(res.status, code, friendly(res.status, code, body?.message || ""), fields);
  }
  // Endpoints return { success, message, data }. Fall back to the whole body
  // for any endpoint that returns a bare object.
  return (body && "data" in body ? body.data : body) as T;
}

// Map a caller path to a real WebDialer URL.
//  - a full URL (authApi/walletApi build these) is used as-is
//  - a short screen path like "/dashboard" or "/call-logs?direction=x" maps to
//    the app endpoint file: ${APP_API}/dashboard.php[?query]
// This lets the existing screens keep calling apiGet("/dashboard") unchanged.
function resolveUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  if (path.includes("/backend/")) return `${BASE}${path}`;
  const qi = path.indexOf("?");
  const p = qi >= 0 ? path.slice(0, qi) : path;
  const q = qi >= 0 ? path.slice(qi) : "";
  return `${APP_API}${p}.php${q}`;
}

export async function apiGet<T = any>(path: string): Promise<T> {
  const res = await fetchWithTimeout(resolveUrl(path), { headers: await authHeaders() });
  return unwrap<T>(res);
}

export async function apiPost<T = any>(path: string, payload: any, auth = true): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth) Object.assign(headers, await authHeaders());
  const res = await fetchWithTimeout(resolveUrl(path), {
    method: "POST",
    headers,
    body: JSON.stringify(payload ?? {}),
  });
  return unwrap<T>(res);
}

// ---------------------------------------------------------------------------
// Typed endpoint surface. Screens call these, not raw paths — so the contract
// lives in one place (the directive's "single frontend API layer").
// ---------------------------------------------------------------------------

type LoginResponse =
  | { two_factor_required: true; method: string; code_sent: boolean | null; challenge: string }
  | { token: string; expires_at: string; user: AuthUser };

export const authApi = {
  /** Password step. Returns a signed-in result or a 2FA challenge. */
  async login(username: string, password: string): Promise<{ result: LoginResult; token?: string }> {
    const d = await apiPost<LoginResponse>(`${APP_API}/login.php`, { username, password }, false);
    if ("two_factor_required" in d && d.two_factor_required) {
      return { result: { status: "2fa", challenge: d.challenge, method: d.method, codeSent: d.code_sent } };
    }
    const ok = d as { token: string; user: AuthUser };
    return { result: { status: "ok", user: ok.user }, token: ok.token };
  },
  /** Answer a 2FA challenge; returns the session token + user. */
  async verify2fa(challenge: string, code: string): Promise<{ token: string; user: AuthUser }> {
    const d = await apiPost<{ token: string; user: AuthUser }>(
      `${APP_API}/two-factor.php`, { challenge, code }, false);
    return { token: d.token, user: d.user };
  },
  me(): Promise<AuthUser> { return apiGet<AuthUser>(`${APP_API}/me.php`); },
  logout(): Promise<null> { return apiPost<null>(`${APP_API}/logout.php`, {}); },
};

export const walletApi = {
  /** Portal-authoritative balance, honest-degrading (never $0 on failure). */
  async balance(): Promise<WalletBalanceState> {
    const d = await apiGet<{ available: boolean; status: string; balance: string | null; currency: string; source: "portal" }>(
      `${APP_API}/balance.php`);
    if (!d.available || d.status !== "ok" || d.balance == null) {
      return { status: "unavailable" };
    }
    return { status: "ok", balance: d.balance, currency: d.currency, source: "portal" };
  },
};

export type { WalletTransaction };

// ---------------------------------------------------------------------------
// Endpoint-specific response types.
//
// These mirror what the WebDialer app API ACTUALLY returns (verified against
// staging). Some endpoints return a bare JSON array, some an object with
// `items`, some a domain-specific key (`numbers`, `plans`). There is no single
// universal envelope below `data`, so every endpoint is typed individually
// rather than assuming `data.items`.
//
// Nothing here invents a field the backend does not send. Where the backend has
// no data for a UI affordance, the screen renders an unavailable/empty state.
// ---------------------------------------------------------------------------

/** Coerce an unknown payload to an array. Accepts a bare array or `{ items }`. */
export function toArray<T = any>(v: any): T[] {
  if (Array.isArray(v)) return v as T[];
  if (v && Array.isArray(v.items)) return v.items as T[];
  return [];
}

export type BalanceEnvelope = {
  available: boolean;
  status: string;
  balance: string | null;
  currency: string;
  source: string;
};

export type DashboardData = {
  profile: { name: string; ext: string; sip_status: string; picture: string | null } | null;
  plan: { name: string; valid_till: string; status: string | null } | null;
  stats: any[];
  quick_stats: any[];
  recent_calls: any[];
};

export type BillingData = {
  balance: BalanceEnvelope | null;
  transactions: any[];
  subscription: any | null;
};

export type Paged<T> = { items: T[]; page: number; limit: number; total?: number; source?: string };

export type ProfileData = {
  full_name: string; username: string; email: string;
  phone: string | null; role: string; status: string;
  member_since: string | null; last_login: string | null;
};

export type ReportsData = {
  window: { from: string; to: string } | null;
  stats: { total_calls: number; total_minutes: number; answered: number; not_answered: number } | null;
  direction: { inbound: number; outbound: number } | null;
  top_destinations: any[];
};

/** Typed screen endpoints. Each returns the real shape, normalised and total. */
export const screensApi = {
  async dashboard(): Promise<DashboardData> {
    const d = await apiGet<any>("/dashboard");
    return {
      profile: d?.profile ?? null,
      plan: d?.plan ?? null,
      stats: toArray(d?.stats),
      quick_stats: toArray(d?.quick_stats),
      recent_calls: toArray(d?.recent_calls),
    };
  },
  async billing(): Promise<BillingData> {
    const d = await apiGet<any>("/billing");
    return {
      balance: d?.balance ?? null,
      transactions: toArray(d?.transactions),
      subscription: d?.subscription ?? null,
    };
  },
  async transactions(): Promise<Paged<any>> {
    const d = await apiGet<any>("/transactions");
    return { items: toArray(d?.items), page: d?.page ?? 1, limit: d?.limit ?? 25, source: d?.source };
  },
  async callLogs(query = ""): Promise<Paged<any>> {
    const d = await apiGet<any>(`/call-logs${query}`);
    return { items: toArray(d?.items), page: d?.page ?? 1, limit: d?.limit ?? 25, total: d?.total ?? 0 };
  },
  /** Bare array from the API. */
  async extensions(): Promise<any[]> { return toArray(await apiGet<any>("/extensions")); },
  /** `{ numbers, stats }` — NOT `items`. */
  async numbers(): Promise<{ numbers: any[]; stats: { total: number; active: number } | null }> {
    const d = await apiGet<any>("/numbers");
    return { numbers: toArray(d?.numbers), stats: d?.stats ?? null };
  },
  /** `{ plans, current }` — NOT `items`. */
  async plans(): Promise<{ plans: any[]; current: any | null }> {
    const d = await apiGet<any>("/plans");
    return { plans: toArray(d?.plans), current: d?.current ?? null };
  },
  async reports(): Promise<ReportsData> {
    const d = await apiGet<any>("/reports");
    return {
      window: d?.window ?? null,
      stats: d?.stats ?? null,
      direction: d?.direction ?? null,
      top_destinations: toArray(d?.top_destinations),
    };
  },
  async profile(): Promise<ProfileData | null> { return (await apiGet<any>("/profile")) ?? null; },
  async contacts(): Promise<any[]> { return toArray(await apiGet<any>("/contacts")); },
  async sms(): Promise<any[]> { return toArray(await apiGet<any>("/sms")); },
  async voicemails(): Promise<any[]> { return toArray(await apiGet<any>("/voicemails")); },
  async support(): Promise<any[]> { return toArray(await apiGet<any>("/support")); },
  async notifications(): Promise<{ items: any[]; unread: number }> {
    const d = await apiGet<any>("/notifications");
    return { items: toArray(d?.items), unread: d?.unread ?? 0 };
  },
  async sipAccounts(): Promise<any[]> { return toArray(await apiGet<any>("/sip-accounts")); },
};

// ---------------------------------------------------------------------------
// Audio Library
//
// REAL data source: GET /backend/api/app/audio-library.php — the app-token
// bridge over the same WebDialer AudioService data (table pkg_ivr_audio) that
// the web endpoint serves. It returns the customer's own prompts plus any the
// platform shares, and exposes a FORMAT string but never a filesystem path.
//
// Preview streams from /backend/api/app/audio-stream.php?id=<id>, which takes
// an id only — never a filename or directory — and 404s (not 403) for a row the
// caller may not hear, so it cannot be used to probe other accounts.
//
// Identity is resolved server-side from the bearer token; there is no uid /
// user_id / account_id parameter. Failures render an honest unavailable state;
// no local fixture is ever substituted.
// ---------------------------------------------------------------------------

export type AudioLibraryItem = {
  id: number;
  name: string;
  description: string | null;
  original_name: string | null;
  /** e.g. "WAV 8000 Hz mono 16-bit" — a format, never a path. */
  format: string;
  duration_ms: number;
  bytes: number;
  source: string | null;
  enabled: boolean;
  is_shared: boolean;
  created_at: string | null;
  used_by: { type: string; name: string }[];
  in_use: boolean;
};

export type AudioLibraryUsage = {
  files: number; files_limit: number | null;
  bytes: number; mb_used: number; mb_limit: number | null;
};

export type AudioLibraryResult =
  | { status: "ok"; items: AudioLibraryItem[]; usage: AudioLibraryUsage | null; accepts: string[] }
  | { status: "unavailable"; reason: string; detail: string };

export const audioLibraryApi = {
  /** The customer's audio library, or an honest unavailable state. */
  async list(): Promise<AudioLibraryResult> {
    try {
      const d = await apiGet<any>("/audio-library");
      return {
        status: "ok",
        items: toArray<AudioLibraryItem>(d?.audio),
        usage: d?.usage ?? null,
        accepts: toArray<string>(d?.accepts),
      };
    } catch (e: any) {
      const code = e?.code ?? "";
      const http = e?.status ?? 0;
      if (http === 401 || http === 403 || code === "UNAUTHORIZED") {
        return {
          status: "unavailable",
          reason: "NOT_EXPOSED_TO_APP",
          detail:
            "The WebDialer audio library authenticates with a web session and " +
            "is not exposed to the mobile app token yet.",
        };
      }
      if (http === 404) {
        return { status: "unavailable", reason: "NO_ENDPOINT", detail: "This WebDialer build has no audio library endpoint." };
      }
      if (http === 0) {
        return { status: "unavailable", reason: "NETWORK", detail: e?.message ?? "Cannot reach the server." };
      }
      return { status: "unavailable", reason: code || `HTTP_${http}`, detail: e?.message ?? "The audio library could not be loaded." };
    }
  },

  /**
   * Authenticated preview source. Takes an id only — never a path or filename.
   * The bearer token travels as a header because the media player fetches the
   * URL itself; the token is never placed in the query string, where it would
   * land in access logs.
   */
  async streamSource(id: number): Promise<{ uri: string; headers: Record<string, string> }> {
    return {
      uri: `${APP_API}/audio-stream.php?id=${encodeURIComponent(String(id))}`,
      headers: await authHeaders(),
    };
  },
};

/** Format a duration in ms as m:ss. */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "0:00";
  const total = Math.round(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/** Human-readable byte size. */
export function formatBytes(b: number): string {
  if (!Number.isFinite(b) || b <= 0) return "0 KB";
  if (b < 1024 * 1024) return `${Math.round(b / 1024)} KB`;
  return `${(b / 1048576).toFixed(1)} MB`;
}

// ---------------------------------------------------------------------------
// Sign-up
//
// REAL endpoint: POST /backend/auth/signup.php — the same WebDialer customer
// registration the web dialer uses. It needs no session (it is how an account
// comes to exist), takes JSON, and returns field-level validation errors.
//
// It creates the account only; the app then signs in through the normal
// login.php path, so there is no separate identity system here.
// ---------------------------------------------------------------------------

export type SignupInput = {
  fullname: string; email: string; username: string;
  password: string; confirm_password: string;
  phone?: string; timezone?: string; accept_terms: boolean;
};

export type SignupResult =
  | { status: "ok" }
  | { status: "invalid"; fields: Record<string, string[]>; message: string }
  | { status: "error"; message: string };

export const signupApi = {
  async register(input: SignupInput): Promise<SignupResult> {
    try {
      await apiPost<any>(`${BASE}/backend/auth/signup.php`, input, false);
      return { status: "ok" };
    } catch (e: any) {
      // The endpoint reports per-field problems so the form can mark inputs.
      const fields = e?.fields ?? e?.body?.data ?? null;
      if (e?.status === 422 && fields && typeof fields === "object") {
        return { status: "invalid", fields, message: e?.message ?? "Please check the highlighted fields" };
      }
      return { status: "error", message: e?.message ?? "Sign-up could not be completed." };
    }
  },
};

// ---------------------------------------------------------------------------
// Recharge (wallet top-up)
//
// REAL endpoint: /backend/api/app/topup.php — the app-token bridge over the
// existing WebDialer PaymentService (Stripe Checkout + Cryptomus), which the
// web dialer already uses.
//
// The app never sees a Stripe secret key, a Cryptomus API key, or a webhook
// secret: it POSTs an amount and receives a HOSTED checkout URL plus an order
// reference. Money is credited only after the backend re-reads the payment from
// the provider — the app saying "it worked" credits nothing.
// ---------------------------------------------------------------------------

export type TopupOptions = {
  gateways: string[];       // [] when no provider is configured
  min: string;
  max: string;
  currency: string;
  history: TopupPayment[];
};

export type TopupPayment = {
  id: number; order_id: string; amount: string; paid_amount: string | null;
  currency: string; status: string; provider: string;
  created_at: string | null; credited_at: string | null;
};

export type TopupStart =
  | { status: "ok"; url: string; order_id: string; provider: string; amount: string; currency: string }
  | { status: "unavailable"; message: string }
  | { status: "invalid"; message: string }
  | { status: "error"; message: string };

export const rechargeApi = {
  async options(): Promise<TopupOptions> {
    const d = await apiGet<any>("/topup");
    return {
      gateways: toArray<string>(d?.gateways),
      min: String(d?.min ?? "1.00"),
      max: String(d?.max ?? "0.00"),
      currency: String(d?.currency ?? "USD"),
      history: toArray<TopupPayment>(d?.history),
    };
  },

  /** Start a top-up. The server validates the amount and picks the gateway. */
  async start(amount: string, gateway?: string): Promise<TopupStart> {
    try {
      const d = await apiPost<any>(`${APP_API}/topup.php`, { amount, gateway });
      return {
        status: "ok",
        url: String(d?.url ?? ""),
        order_id: String(d?.order_id ?? ""),
        provider: String(d?.provider ?? gateway ?? ""),
        amount: String(d?.amount ?? amount),
        currency: String(d?.currency ?? "USD"),
      };
    } catch (e: any) {
      const code = e?.code ?? "";
      if (code === "GATEWAY_UNAVAILABLE" || e?.status === 503) {
        return { status: "unavailable", message: e?.message ?? "No payment method is configured." };
      }
      if (code === "INVALID_AMOUNT" || e?.status === 422) {
        return { status: "invalid", message: e?.message ?? "That amount is not valid." };
      }
      return { status: "error", message: e?.message ?? "Could not start the payment." };
    }
  },
};

/**
 * Password reset request.
 *
 * REAL endpoint: POST /backend/auth/forgot-password.php — pre-auth, so the app
 * calls it directly. The backend ALWAYS answers success whether or not the
 * address exists, so this never reveals which emails have accounts; the UI must
 * present it the same way.
 */
export const passwordResetApi = {
  async request(email: string): Promise<{ ok: boolean; message: string }> {
    try {
      await apiPost<any>(`${BASE}/backend/auth/forgot-password.php`, { email }, false);
      return { ok: true, message: "If an account exists for that address, the link is on its way." };
    } catch (e: any) {
      if (e?.status === 422) {
        return { ok: false, message: e?.message ?? "Please enter a valid email address." };
      }
      return { ok: false, message: e?.message ?? "Could not send the reset link. Please try again." };
    }
  },
};
