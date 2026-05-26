/**
 * Votta Auth Context
 *
 * Provides login/logout state and current user to the entire app.
 * Persists the access token in localStorage so users stay logged in
 * across page refreshes.
 *
 * The login flow:
 *   1. User submits email + password on /login
 *   2. We call POST /api/v1/auth/login via apiLogin()
 *   3. Backend calls Supabase, returns { accessToken, refreshToken, user }
 *   4. We store the accessToken; all subsequent API calls use it
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { apiLogin, apiLogout, apiGetMe, tokenStore, apiRefresh } from './api';

export type AuthUser = {
  id:            string;
  email:         string;
  role:          'admin' | 'student';
  institutionId: string;
};

type AuthState =
  | { status: 'loading' }
  | { status: 'authenticated'; user: AuthUser }
  | { status: 'unauthenticated' };

type AuthContextValue = {
  state:   AuthState;
  login:   (email: string, password: string) => Promise<void>;
  logout:  () => Promise<void>;
  user:    AuthUser | null;
  isAdmin: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  // On mount: check if we have a stored token and verify it against /auth/me
  useEffect(() => {
    const token = tokenStore.get();
    if (!token) {
      setState({ status: 'unauthenticated' });
      return;
    }

    apiGetMe()
      .then((user) => {
        setState({ status: 'authenticated', user: user as AuthUser });
      })
      .catch(async () => {
        // Token may be expired — try refreshing
        const newToken = await apiRefresh();
        if (newToken) {
          apiGetMe()
            .then((user) => setState({ status: 'authenticated', user: user as AuthUser }))
            .catch(() => setState({ status: 'unauthenticated' }));
        } else {
          setState({ status: 'unauthenticated' });
        }
      });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    await apiLogin(email, password);
    const user = await apiGetMe();
    setState({ status: 'authenticated', user: user as AuthUser });
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setState({ status: 'unauthenticated' });
  }, []);

  const user = state.status === 'authenticated' ? state.user : null;

  return (
    <AuthContext.Provider
      value={{
        state,
        login,
        logout,
        user,
        isAdmin: user?.role === 'admin',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

/** Returns true only when auth state has resolved (not loading) */
export function useAuthReady() {
  const { state } = useAuth();
  return state.status !== 'loading';
}
