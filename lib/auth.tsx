"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { apiLogin, apiLogout, apiGetMe, tokenStore, apiRefresh } from "./api";

export type AuthUser = {
  id: string;
  email: string;
  role: "super_admin" | "admin" | "student";
  institutionId?: string; // undefined for super_admin
};

type AuthState =
  | { status: "loading" }
  | { status: "authenticated"; user: AuthUser }
  | { status: "unauthenticated" };

type AuthContextValue = {
  state: AuthState;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  user: AuthUser | null;
  isAdmin: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading" });

  useEffect(() => {
    const token = tokenStore.get();
    if (!token) {
      setState({ status: "unauthenticated" });
      return;
    }

    apiGetMe()
      .then((user) => {
        setState({ status: "authenticated", user: user as AuthUser });
      })
      .catch(async () => {
        const newToken = await apiRefresh();
        if (newToken) {
          apiGetMe()
            .then((user) =>
              setState({ status: "authenticated", user: user as AuthUser })
            )
            .catch(() => setState({ status: "unauthenticated" }));
        } else {
          setState({ status: "unauthenticated" });
        }
      });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    await apiLogin(email, password);
    const user = await apiGetMe();
    setState({ status: "authenticated", user: user as AuthUser });
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setState({ status: "unauthenticated" });
  }, []);

  const user = state.status === "authenticated" ? state.user : null;

  return (
    <AuthContext.Provider
      value={{
        state,
        login,
        logout,
        user,
        isAdmin: user?.role === "admin" || user?.role === "super_admin",
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

export function useAuthReady() {
  const { state } = useAuth();
  return state.status !== "loading";
}
