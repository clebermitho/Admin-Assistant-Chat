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
}

// ============================================================
// request — fetch com retry, timeout e refresh automático
// ============================================================
let _isRefreshing = false;
let _refreshQueue: Array<(token: string) => void> = [];

async function doRefresh(): Promise<string> {
  const rToken = getRefreshToken();
  if (!rToken) throw new Error('Sem refresh token.');

  const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: rToken }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    clearTokens();
    throw new Error('Sessão expirada. Faça login novamente.');
  }

  const data = await res.json();
  localStorage.setItem('chatplay_token', data.token);

  return data.token;
}

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
      signal: AbortSignal.timeout(30_000),
    });
  };

  let res = await makeReq();

  // Refresh automático
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

  if (!res.ok) {
    const text = await res.text();
    let message = `HTTP ${res.status}`;
    try {
      const json = JSON.parse(text);
      message = json.error || json.message || message;
    } catch {}
    throw new Error(message);
  }

  return await res.json();
}

// ============================================================
// Auth
// ============================================================
export const authApi = {
  login: async (email: string, password: string) => {
  const data = await request<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  localStorage.setItem('chatplay_token', data.token);
  localStorage.setItem('chatplay_refresh_token', data.refreshToken);

  return data;
},

  me: () =>
    request<{ user: User }>('/api/auth/me'),

  logout: () =>
    request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),
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
    request<{ key: string; value: unknown }>(`/api/settings/${encodeURIComponent(key)}`, {
      method: 'PUT',
      body: JSON.stringify({ value }),
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
    return request<{ events: RecentEventsResponse['events']; total: number }>(`/api/events?${qs}`);
  },
};