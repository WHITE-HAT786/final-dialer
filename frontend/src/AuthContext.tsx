import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { storage } from "@/src/utils/storage";
import { authApi, AUTH_KEY } from "@/src/api";
import { AuthUser, LoginResult } from "@/src/types";

export type { AuthUser } from "@/src/types";

/** The 2FA step lives on its own route, so the challenge is held here. */
export type Pending2fa = {
  challenge: string;
  /** "email" | "totp" — decides the code screen's copy and resend affordance. */
  method: string;
  /** What the user typed at the password step, echoed on the code screen. */
  identifier: string;
  codeSent: boolean | null;
};

export type RegisterPayload = {
  name: string;
  email: string;
  username: string;
  phone: string;
  password: string;
  timezone: string;
};

type AuthCtx = {
  user: AuthUser | null;
  loading: boolean;
  /** Password step. Signs in on success, or returns a 2FA challenge to answer. */
  loginEmail: (usernameOrEmail: string, password: string) => Promise<LoginResult>;
  /** Set once loginEmail reports a challenge; cleared on success or cancel. */
  pending2fa: Pending2fa | null;
  clearPending2fa: () => void;
  /** Complete a 2FA login with the pending challenge + the user's code. */
  verify2fa: (code: string) => Promise<void>;
  registerEmail: (payload: RegisterPayload) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  loginGoogleSession: (sessionId: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending2fa, setPending2fa] = useState<Pending2fa | null>(null);

  const persist = async (token: string, u: AuthUser) => {
    await storage.secureSet(AUTH_KEY, token);
    setPending2fa(null);
    setUser(u);
  };

  const refresh = async () => {
    try {
      const token = await storage.secureGet<string>(AUTH_KEY, "");
      if (!token) { setUser(null); return; }
      setUser(await authApi.me());
    } catch {
      // Token invalid/expired/revoked -> drop it and show the login screen.
      await storage.secureRemove(AUTH_KEY);
      setUser(null);
    }
  };

  useEffect(() => {
    (async () => { await refresh(); setLoading(false); })();
  }, []);

  const loginEmail = async (usernameOrEmail: string, password: string): Promise<LoginResult> => {
    const { result, token } = await authApi.login(usernameOrEmail, password);
    if (result.status === "ok" && token) {
      await persist(token, result.user);
    } else if (result.status === "2fa") {
      setPending2fa({
        challenge: result.challenge,
        method: result.method,
        identifier: usernameOrEmail,
        codeSent: result.codeSent,
      });
    }
    return result;
  };

  const clearPending2fa = () => setPending2fa(null);

  const verify2fa = async (code: string) => {
    if (!pending2fa) throw new Error("That sign-in attempt expired. Please sign in again.");
    const { token, user: u } = await authApi.verify2fa(pending2fa.challenge, code);
    await persist(token, u);
  };

  // Not part of the customer softphone flow — surfaced honestly rather than faked.
  // The sign-up and reset screens render fully; submitting reports the real
  // state instead of showing a success the backend never performed.
  const registerEmail = async () => {
    throw new Error("Accounts are provisioned by your administrator.");
  };
  const requestPasswordReset = async () => {
    throw new Error(
      "Password reset isn't available in this build yet — contact support@depthroute.com.",
    );
  };
  const loginGoogleSession = async () => {
    throw new Error("Google sign-in isn't available in this build yet.");
  };

  const logout = async () => {
    try { await authApi.logout(); } catch { /* revoke is best-effort */ }
    await storage.secureRemove(AUTH_KEY);
    setPending2fa(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        loginEmail,
        pending2fa,
        clearPending2fa,
        verify2fa,
        registerEmail,
        requestPasswordReset,
        loginGoogleSession,
        logout,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
