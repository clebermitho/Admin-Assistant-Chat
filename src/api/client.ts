import { API_BASE_URL } from '@/lib/constants';
import type {
  User, AuthResponse, MetricsSummaryResponse, ActivityData,
  UsersResponse, SuggestionsResponse, RejectedFeedbackResponse,
  TemplatesResponse, SettingsResponse,
  AnalyticsOverviewResponse, UsagePerUserResponse, UsageOverTimeResponse,
  UserUsageRecord, UsageDataPoint,
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
  localStorage.setItem('chatplay_refresh_token', data.refreshToken);

  if (data.expiresAt) {
    localStorage.setItem('chatplay_token_expires', data.expiresAt);
  }

  return data.token;
}

// ============================================================
// REQUEST PADRÃO
// ============================================================
function generateRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const ts = typeof performance !== 'undefined' ? performance.now() : Date.now();
  return `${Date.now().toString(36)}-${ts.toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  const token = getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Request-ID': generateRequestId(),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> | undefined),
  };

  const makeReq = async (tk?: string) => {
    if (tk) headers['Authorization'] = `Bearer ${tk}`;
    const timeoutSignal = AbortSignal.timeout(30000);
    const signal = options.signal
      ? AbortSignal.any([options.signal, timeoutSignal])
      : timeoutSignal;
    return fetch(url, {
      ...options,
      headers,
      signal,
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
  login: async (identifier: string, password: string) => {
    try {
      const body = identifier.includes('@')
        ? { email: identifier, password }
        : { username: identifier, password };
      const data = await request<AuthResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(body),
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

  get: (id: string) =>
    request<{ user: User & { stats?: Record<string, unknown> } }>(`/api/users/${id}`),

  create: (data: { name: string; email?: string; username?: string; password: string; role: string }) =>
    request<{ user: User }>('/api/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: { isActive?: boolean; role?: string; name?: string; dailyChatLimit?: number | null; dailySuggestionLimit?: number | null }) =>
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

export const quotaApi = {
  get: () =>
    request<{
      period: string;
      organization: { id: string; name: string };
      monthlyQuota: number;
      usedTokens: number;
      remaining: number;
    }>('/api/quota'),

  update: (monthlyQuota: number) =>
    request<{
      period: string;
      organization: { id: string; name: string };
      monthlyQuota: number;
      usedTokens: number;
      remaining: number;
    }>('/api/quota', {
      method: 'PUT',
      body: JSON.stringify({ monthlyQuota }),
    }),

  reset: () =>
    request<{
      period: string;
      organization: { id: string; name: string };
      monthlyQuota: number;
      usedTokens: number;
      remaining: number;
    }>('/api/quota', {
      method: 'PUT',
      body: JSON.stringify({ resetUsedTokens: true }),
    }),
};

// ============================================================
// Analytics
// ============================================================
export const analyticsApi = {
  overview: async (options?: RequestInit): Promise<AnalyticsOverviewResponse> => {
    const raw = await request<Record<string, unknown>>('/api/analytics/overview', options);
    return {
      totalCalls: Number(raw.totalCalls ?? raw.totalApiCalls ?? 0),
      tokensUsed: Number(raw.tokensUsed ?? raw.totalTokensUsed ?? 0),
      monthlyQuota: Number(raw.monthlyQuota ?? 0),
      quotaPercent: Number(raw.quotaPercent ?? raw.quotaUsagePercent ?? 0),
      estimatedCostUsd: Number(raw.estimatedCostUsd ?? raw.estimatedCostUSD ?? 0),
      totalUsers: Number(raw.totalUsers ?? 0),
      activeUsers: Number(raw.activeUsers ?? 0),
    };
  },

  usagePerUser: async (since?: string, options?: RequestInit): Promise<UsagePerUserResponse> => {
    const params = since ? `?since=${encodeURIComponent(since)}` : '';
    const raw = await request<{ users: Record<string, unknown>[] }>(`/api/analytics/usage-per-user${params}`, options);
    const users: UserUsageRecord[] = (raw.users ?? []).map((u) => ({
      userId: String(u.userId ?? ''),
      name: String(u.name ?? ''),
      email: String(u.email ?? ''),
      requests: Number(u.requests ?? u.totalRequests ?? 0),
      tokens: Number(u.tokens ?? u.totalTokens ?? 0),
      estimatedCostUsd: Number(u.estimatedCostUsd ?? u.estimatedCost ?? 0),
    }));
    return { users };
  },

  usageOverTime: async (since?: string, granularity = 'day', options?: RequestInit): Promise<UsageOverTimeResponse> => {
    const params = new URLSearchParams();
    if (since) params.set('since', since);
    params.set('granularity', granularity);
    const raw = await request<{ data: Record<string, unknown>[] }>(`/api/analytics/usage-over-time?${params}`, options);
    const data: UsageDataPoint[] = (raw.data ?? []).map((d) => ({
      date: String(d.date ?? ''),
      requests: Number(d.requests ?? 0),
      tokens: Number(d.tokens ?? 0),
      estimatedCostUsd: Number(d.estimatedCostUsd ?? d.cost ?? 0),
    }));
    return { data };
  },
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
