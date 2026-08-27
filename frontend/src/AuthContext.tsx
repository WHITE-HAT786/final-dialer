import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { storage } from "@/src/utils/storage";
import { authApi, AUTH_KEY } from "@/src/api";
import { AuthUser, LoginResult } from "@/src/types";

export type { AuthUser } from "@/src/types";

type AuthCtx = {
  user: AuthUser | null;
  loading: boolean;
  /** Password step. Signs in on success, or returns a 2FA challenge to answer. */
  loginEmail: (usernameOrEmail: string, password: string) => Promise<LoginResult>;
  /** Complete a 2FA login with the challenge from loginEmail + the user's code. */
  verify2fa: (challenge: string, code: string) => Promise<void>;
  registerEmail: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const persist = async (token: string, u: AuthUser) => {
    await storage.secureSet(AUTH_KEY, token);
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
    if (result.status === "ok" && token) await persist(token, result.user);
    return result;
  };

  const verify2fa = async (challenge: string, code: string) => {
    const { token, user: u } = await authApi.verify2fa(challenge, code);
    await persist(token, u);
  };

  // Not part of the customer softphone flow — surfaced honestly rather than faked.
  const registerEmail = async () => {
    throw new Error("Accounts are provisioned by your administrator.");
  };

  const logout = async () => {
    try { await authApi.logout(); } catch { /* revoke is best-effort */ }
    await storage.secureRemove(AUTH_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, loginEmail, verify2fa, registerEmail, logout, refresh }}
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
