import { storage } from "@/src/utils/storage";
import { Platform } from "react-native";

const BASE = (process.env.EXPO_PUBLIC_BACKEND_URL || "").replace(/\/+$/, "");
export const API_BASE = `${BASE}/api`;
export const AUTH_KEY = "auth_token";

async function authHeaders(): Promise<Record<string, string>> {
  const token = await storage.secureGet<string>(AUTH_KEY, "");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Fetch with timeout + friendly error messages that include the failing URL.
async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs = 20000,
): Promise<Response> {
  if (!BASE) {
    throw new Error(
      "Backend URL is not configured. EXPO_PUBLIC_BACKEND_URL is empty. " +
        "If you're on Expo Go, close and re-open the app after the build finishes.",
    );
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (e: any) {
    // React Native throws "TypeError: Network request failed" when it can't
    // reach the host. Give the user something actionable instead.
    const isAbort = e?.name === "AbortError";
    const platform = Platform.OS;
    const short = isAbort
      ? `Server timed out after ${Math.round(timeoutMs / 1000)}s`
      : "Cannot reach server";
    const detail = ` (${platform}) ${url}${e?.message ? " — " + e.message : ""}`;
    throw new Error(`${short}.${detail}`);
  } finally {
    clearTimeout(timer);
  }
}

export async function apiGet<T = any>(path: string): Promise<T> {
  const headers = await authHeaders();
  const url = `${API_BASE}${path}`;
  const res = await fetchWithTimeout(url, { headers });
  if (!res.ok) {
    let detail = "";
    try {
      const d = await res.json();
      detail = d?.detail || d?.message || "";
    } catch {}
    throw new Error(`GET ${path} failed: ${res.status}${detail ? ` — ${detail}` : ""}`);
  }
  return res.json();
}

export async function apiPost<T = any>(path: string, body: any, auth = true): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth) Object.assign(headers, await authHeaders());
  const url = `${API_BASE}${path}`;
  const res = await fetchWithTimeout(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data && (data.detail || data.message)) || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}
