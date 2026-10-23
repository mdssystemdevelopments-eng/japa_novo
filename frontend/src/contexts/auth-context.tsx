'use client';

import { apiRequest } from '@/lib/api';
import {
  AuthSession,
  clearSession,
  loadSession,
  saveSession,
  StoredUser,
} from '@/lib/auth-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

type AuthContextValue = {
  user: StoredUser | null;
  accessToken: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (key: string) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setSession(loadSession());
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiRequest<AuthSession & { user: StoredUser }>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      },
    );
    const next: AuthSession = {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      user: data.user,
    };
    saveSession(next);
    setSession(next);
  }, []);

  const logout = useCallback(async () => {
    const current = loadSession();
    if (current?.accessToken) {
      try {
        await apiRequest('/auth/logout', {
          method: 'POST',
          token: current.accessToken,
        });
      } catch {
        /* encerra sessão local mesmo se a API falhar */
      }
    }
    clearSession();
    setSession(null);
  }, []);

  const hasPermission = useCallback(
    (key: string) => {
      if (!session?.user) return false;
      if (session.user.roles.includes('ADMINISTRADOR')) return true;
      return session.user.permissions?.includes(key) ?? false;
    },
    [session],
  );

  const value = useMemo(
    () => ({
      user: session?.user ?? null,
      accessToken: session?.accessToken ?? null,
      loading,
      login,
      logout,
      hasPermission,
    }),
    [session, loading, login, logout, hasPermission],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return ctx;
}
