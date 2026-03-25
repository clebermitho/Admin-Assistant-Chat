// ============================================================
// User Types
// ============================================================
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'AGENT' | 'ADMIN' | 'SUPER_ADMIN';
  isActive?: boolean;
  isOnline?: boolean;
  lastSeenAt?: string | null;
  dailyChatLimit?: number | null;
  dailySuggestionLimit?: number | null;
  organizationId?: string;
  organization?: {
    id: string;
    name: string;
    slug: string;
  };
}

// ============================================================
// Auth Types
// ============================================================
export interface AuthResponse {
  token: string;
  refreshToken: string;
  expiresAt: string;
  refreshExpiresAt: string;
  user: User;
}

// ============================================================
// Metrics Types
// Alinhado com GET /api/metrics/summary do backend
// ============================================================
export interface MetricsSummaryResponse {
  period: { since: string; until: string };
  users: {
    total: number;
    active: number;
  };
  suggestions: {
    total: number;
    approvalRate: number;
    avgLatencyMs: number | null;
  };
  feedback: {
    total: number;
    approved: number;
    rejected: number;
  };
  events: {
    total: number;
    byType: Array<{ type: string; count: number }>;
  };
  templates: {
    total: number;
    learned: number;
  };
  topUsers: Array<{ userId: string; events: number }>;
}

export interface ActivityData {
  days: number;
  activity: Record<string, Record<string, number>>;
}

// ============================================================
// Users Types
// ============================================================
export interface UsersResponse {
  users: User[];
}

// ============================================================
// Suggestions Types
// ============================================================
export interface Suggestion {
  id: string;
  text: string;
  category: string;
  score: number;
  usageCount: number;
  source: 'AI' | 'TEMPLATE' | 'MANUAL';
  createdAt?: string;
}

export interface SuggestionsResponse {
  suggestions: Suggestion[];
}

export interface RejectedFeedbackResponse {
  rejected: Array<{
    id: string;
    suggestionId: string;
    reason?: string | null;
    createdAt: string;
    suggestion?: {
      id: string;
      text: string;
      category: string;
    } | null;
    user?: {
      id: string;
      name: string;
    } | null;
  }>;
  total: number;
}

// ============================================================
// Templates Types
// ============================================================
export interface Template {
  id: string;
  category: string;
  text: string;
  score: number;
  usageCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TemplatesResponse {
  templates: Template[];
}

// ============================================================
// Settings Types
// ============================================================
export type SettingValue = string | number | boolean;

export type Settings = Record<string, SettingValue>;

export interface SettingsResponse {
  settings: Settings;
}
