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
// Base URL — the WebDialer origin the app talks to (endpoints live under
// /backend/api/app/*). Defaults to the production API host so a fresh clone
// works with ZERO config; override via EXPO_PUBLIC_BACKEND_URL (.env or eas env)
// to point at staging or another backend. There is no separate/mock backend.
//
// Only the ORIGIN is a public client var. HMAC secrets, the portal account
// mapping, API keys and DB credentials are SERVER-ONLY and never shipped here.
// ---------------------------------------------------------------------------
const DEFAULT_BACKEND_URL = "https://api.depthroute.com";
const BASE = (process.env.EXPO_PUBLIC_BACKEND_URL || DEFAULT_BACKEND_URL).replace(/\/+$/, "");
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
    throw new ApiError(res.status, code, friendly(res.status, code, body?.message || ""));
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
  /**
   * Google sign-in: exchange a Google ID token (+ the nonce it was minted with)
   * for the SAME app session a password login yields. The backend verifies the
   * token (sig/iss/aud/exp/nonce) and resolves an EXISTING linked identity — the
   * app never sends an email/uid, and no client_secret is ever shipped here.
   */
  async google(idToken: string, nonce: string): Promise<{ token: string; user: AuthUser }> {
    const d = await apiPost<{ token: string; user: AuthUser }>(
      `${APP_API}/google.php`, { id_token: idToken, nonce }, false);
    return { token: d.token, user: d.user };
  },
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
