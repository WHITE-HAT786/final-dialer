// Shared API types for the WebDialer integration. The frontend talks to the
// existing WebDialer backend (portal-wallet authoritative) — NOT the scaffold.
//
// Every response is the WebDialer envelope { success, message, data } or, on
// failure, { success:false, error, message }. `api.ts` unwraps `data` and throws
// an ApiError for the rest, so screens work with these inner shapes.

export type AuthUser = {
  user_id: string;
  name: string;
  email: string;
  picture?: string | null;
  role: string;
  created_at: string;
};

/** Result of the password step: either signed-in, or a 2FA challenge to answer. */
export type LoginResult =
  | { status: "ok"; user: AuthUser }
  | { status: "2fa"; challenge: string; method: string; codeSent: boolean | null };

export type WalletBalanceState =
  // The ONLY three states the UI may render. `unavailable` is distinct from a
  // real 0.00 and must never be shown as $0.00.
  | { status: "loading" }
  | { status: "ok"; balance: string; currency: string; source: "portal" }
  | { status: "unavailable"; reason?: string };

export type WalletTransaction = {
  id: string | number | null;
  amount: string;
  balance_after?: string | null;
  type: string;
  description?: string;
  created_at?: string | null;
};

export type Paginated<T> = {
  items: T[];
  page: number;
  limit: number;
  total: number;
};

/** A typed error carrying the backend's machine code + HTTP status. */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
  /** True when the caller should force a re-login. */
  get isAuth(): boolean {
    return this.status === 401 || this.code === "TOKEN_EXPIRED" || this.code === "TOKEN_REVOKED";
  }
}
