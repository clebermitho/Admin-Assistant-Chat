import React, {
  createContext, useContext, useEffect, useState, useCallback,
} from 'react';
import type { User } from '@/types';
import { authApi } from '@/api/client';

// ============================================================
// Auth Context
// ============================================================

interface AuthContextValue {
  user:      User | null;
  token:     string | null;
  isLoading: boolean;
  login:     (email: string, password: string) => Promise<void>;
  logout:    () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY         = 'chatplay_token';
const REFRESH_TOKEN_KEY = 'chatplay_refresh_token';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,      setUser]      = useState<User | null>(null);
  const [token,     setToken]     = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [isLoading, setIsLoading] = useState(true);

  // Validar token ao montar — com tolerância ao cold start do Render (free tier)
  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (!stored) { setIsLoading(false); return; }

    setToken(stored);

    const tryValidate = async (attempt = 1): Promise<void> => {
      try {
        const res = await authApi.me();
        setUser(res.user);
      } catch (err: unknown) {
        const isNetworkErr = err instanceof TypeError ||
          (err instanceof Error && (
            err.message.includes('timeout') ||
            err.message.includes('fetch') ||
            err.message.includes('Failed to fetch') ||
            err.message.includes('503')
          ));
        const httpStatus = (err as { status?: number })?.status;

        // Render cold start (503/network) — retry até 3x com backoff
        if (isNetworkErr && attempt < 3) {
          console.warn(`[Auth] Tentativa ${attempt} falhou (cold start?). Retry em ${attempt * 2}s...`);
          await new Promise(r => setTimeout(r, attempt * 2000));
          return tryValidate(attempt + 1);
        }

        // 401/403 = token inválido → limpa sessão
        if (httpStatus === 401 || httpStatus === 403) {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(REFRESH_TOKEN_KEY);
          setToken(null);
          setUser(null);
        } else {
          // Outros erros (rede, 5xx): mantém token mas sem user — modo degradado
          console.warn('[Auth] Backend inacessível. Modo degradado ativo.');
        }
      } finally {
        if (attempt === 1 || attempt >= 3) setIsLoading(false);
      }
    };

    tryValidate().finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    localStorage.setItem(TOKEN_KEY, res.token);
    if (res.refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, res.refreshToken);
    }
    setToken(res.token);
    setUser(res.user);
  }, []);

  const logout = useCallback(async () => {
    try { await authApi.logout(); } catch { /* ignorar erros de rede no logout */ }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
