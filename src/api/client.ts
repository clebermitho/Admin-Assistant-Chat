import { API_BASE_URL } from '@/lib/constants';
import type {
  User, AuthResponse, MetricsSummaryResponse, ActivityData,
  UsersResponse, SuggestionsResponse, RejectedFeedbackResponse,
  TemplatesResponse, SettingsResponse,
} from '@/types';

// ============================================================
// Tipos auxiliares
// ============================================================
export interface RecentEventsResponse {
  events: Array<{
    id: string;
    eventType: string;
    payload: Record<string, unknown>;
    createdAt: string;
    user?: { id: string; name: string } | null;
  }>;
  summary24h: Array<{ type: string; count: number }>;
}

// ============================================================
// Armazenamento do token
// ============================================================
function getToken(): string | null {
  return localStorage.getItem('chatplay_token');
}

function getRefreshToken(): string | null {
  return localStorage.getItem('chatplay_refresh_token');
}

function clearTokens(): void {
  localStorage.removeItem('chatplay_token');
  localStorage.removeItem('chatplay_refresh_token');
  localStorage.removeItem('chatplay_token_expires');
}

// ============================================================
// Refresh token
// ============================================================
async function doRefresh(): Promise<string> {
  const rToken = getRefreshToken();
  if (!rToken) throw new Error('Sem refresh token.');

  const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: rToken }),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    clearTokens();
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  const data = await res.json();
  localStorage.setItem('chatplay_token', data.token);

  if (data.expiresAt) {
    localStorage.setItem('chatplay_token_expires', data.expiresAt);
  }

  return data.token;
}

// ============================================================
// REQUEST PADRÃO
// ============================================================
async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const token = getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> | undefined),
  };

  const makeReq = async (tk?: string) => {
    if (tk) headers['Authorization'] = `Bearer ${tk}`;
    return fetch(url, {
      ...options,
      headers,
      signal: AbortSignal.timeout(30000),
    });
  };

  let res = await makeReq();

  // Refresh automático em 401
  if (res.status === 401 && getRefreshToken()) {
    try {
      const newToken = await doRefresh();
      res = await makeReq(newToken);
    } catch {
      clearTokens();
      window.location.hash = '#/login';
      throw new Error('Sessão expirada.');
    }
  }

  // Tratamento de erro HTTP
  if (!res.ok) {
    const text = await res.text();
    let message = `HTTP ${res.status}`;
    try {
      const json = JSON.parse(text);
      message = json.error || json.message || message;
    } catch { /* mantém mensagem genérica */ }
    const err = new Error(message) as Error & { status: number };
    err.status = res.status;
    throw err;
  }

  // Leitura segura do JSON
  try {
    const text = await res.text();
    if (!text || text.trim() === '') {
      throw new Error('Resposta vazia do servidor');
    }
    return JSON.parse(text) as T;
  } catch (err) {
    console.error('Erro ao parsear JSON:', err);
    throw new Error('Resposta inválida do servidor');
  }
}

// ============================================================
// Auth
// ============================================================
export const authApi = {
  login: async (email: string, password: string) => {
    try {
      const data = await request<AuthResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      if (!data?.token) throw new Error('Login falhou: token não recebido');
      if (!data?.refreshToken) throw new Error('Login falhou: refresh token não recebido');

      localStorage.setItem('chatplay_token', data.token);
      localStorage.setItem('chatplay_refresh_token', data.refreshToken);
      if (data.expiresAt) {
        localStorage.setItem('chatplay_token_expires', data.expiresAt);
      }

      return data;
    } catch (error) {
      console.error('Erro no login:', error);
      throw error;
    }
  },

  me: () =>
    request<{ user: User }>('/api/auth/me'),

  logout: async () => {
    try {
      const result = await request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' });
      clearTokens();
      return result;
    } catch (error) {
      clearTokens();
      throw error;
    }
  },
};

// ============================================================
// Metrics
// ============================================================
export const metricsApi = {
  summary: (since?: string) => {
    const qs = since ? `?since=${encodeURIComponent(since)}` : '';
    return request<MetricsSummaryResponse>(`/api/metrics/summary${qs}`);
  },

  activity: (days = 7) =>
    request<ActivityData>(`/api/metrics/activity?days=${days}`),
};

// ============================================================
// Users
// ============================================================
export const usersApi = {
  list: () =>
    request<UsersResponse>('/api/users'),

  create: (data: { name: string; email: string; password: string; role: string }) =>
    request<{ user: User }>('/api/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: { isActive?: boolean; role?: string; name?: string }) =>
    request<{ user: User }>(`/api/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  resetPassword: (id: string, newPassword: string) =>
    request<{ ok: boolean; message: string }>(`/api/users/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    }),
};

// ============================================================
// Suggestions
// ============================================================
export const suggestionsApi = {
  list: (category?: string, limit = 50) => {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    params.set('limit', String(limit));
    return request<SuggestionsResponse>(`/api/suggestions?${params}`);
  },

  rejectedFeedback: () =>
    request<RejectedFeedbackResponse>('/api/feedback/rejected'),
};

// ============================================================
// Templates
// ============================================================
export const templatesApi = {
  list: (category?: string) => {
    const qs = category ? `?category=${encodeURIComponent(category)}` : '';
    return request<TemplatesResponse>(`/api/templates${qs}`);
  },

  create: (data: { category: string; text: string }) =>
    request<{ id: string; category: string; text: string }>('/api/templates', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<{ ok: boolean }>(`/api/templates/${id}`, { method: 'DELETE' }),
};

// ============================================================
// Settings
// ============================================================
export const settingsApi = {
  list: () =>
    request<SettingsResponse>('/api/settings'),

  update: (key: string, value: string | number | boolean) =>
    request<{ key: string; value: unknown }>(
      `/api/settings/${encodeURIComponent(key)}`,
      {
        method: 'PUT',
        body: JSON.stringify({ value }),
      }
    ),

  /** Salva múltiplas settings em uma única requisição (PUT /api/settings/bulk) */
  bulkUpdate: (settings: Record<string, string | number | boolean>) =>
    request<{ saved: number; settings: Record<string, unknown> }>(
      '/api/settings/bulk',
      {
        method: 'PUT',
        body: JSON.stringify({ settings }),
      }
    ).catch(() => {
      // Fallback: se bulk não suportado, salva uma por vez
      return Promise.all(
        Object.entries(settings).map(([k, v]) =>
          request<{ key: string; value: unknown }>(
            `/api/settings/${encodeURIComponent(k)}`,
            { method: 'PUT', body: JSON.stringify({ value: v }) }
          ).catch((e: Error) => {
            console.warn(`[Settings] Falha ao salvar "${k}":`, e.message);
            return null;
          })
        )
      ).then((results) => ({
        saved: results.filter(Boolean).length,
        settings: Object.fromEntries(
          Object.entries(settings).map(([k, v]) => [k, v])
        ),
      }));
    }),
};

// ============================================================
// Events
// ============================================================
export const eventsApi = {
  recent: (filter?: 'errors' | 'ai' | 'auth', limit = 20) => {
    const params = new URLSearchParams();
    if (filter) params.set('filter', filter);
    params.set('limit', String(limit));
    return request<RecentEventsResponse>(`/api/events/recent?${params}`);
  },

  list: (params?: { eventType?: string; userId?: string; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.eventType) qs.set('eventType', params.eventType);
    if (params?.userId) qs.set('userId', params.userId);
    if (params?.limit) qs.set('limit', String(params.limit));

    return request<{ events: RecentEventsResponse['events']; total: number }>(
      `/api/events?${qs}`
    );
  },
};
