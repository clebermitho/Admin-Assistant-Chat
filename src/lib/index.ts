<<<<<<< HEAD
export { ROUTE_PATHS, SUGGESTION_CATEGORIES, USER_ROLES } from './constants';
export type { SuggestionCategory, UserRole } from './constants';
export { cn } from './utils';
=======
// ============================================================
// User Types
// ============================================================
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'USER' | 'VIEWER';
  isActive?: boolean;
  lastSeenAt?: string;
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
// ============================================================
export interface MetricsSummaryResponse {
  users: {
    total: number;
    active: number;
  };
  suggestions: {
    total: number;
    approvalRate: number;
    avgLatencyMs?: number;
  };
  feedback: {
    approved: number;
    rejected: number;
  };
  events: {
    total: number;
    byType: Array<{ type: string; count: number }>;
  };
  templates?: {
    total: number;
    learned: number;
  };
  performance?: {
    avgApiTimeMs: number;
    totalCalls: number;
  };
}

export interface ActivityData {
  activity: Record<string, Record<string, number>>;
}

// ============================================================
// Users Types
// ============================================================
export interface UsersResponse {
  users: User[];
  total: number;
}

// ============================================================
// Suggestions Types
// ============================================================
export interface Suggestion {
  id: string;
  text: string;
  category: string;
  confidence: number;
  createdAt: string;
  accepted?: boolean;
  rejected?: boolean;
  user?: {
    id: string;
    name: string;
  };
}

export interface SuggestionsResponse {
  suggestions: Suggestion[];
  total: number;
}

export interface RejectedFeedback {
  id: string;
  suggestionId: string;
  type: string;
  reason?: string;
  comment?: string;
  createdAt: string;
  user?: {
    id: string;
    name: string;
  };
  suggestion?: {
    id: string;
    text: string;
    category: string;
  };
}

export interface RejectedFeedbackResponse {
  rejected: RejectedFeedback[];
  total: number;
}

// ============================================================
// Templates Types
// ============================================================
export interface Template {
  id: string;
  category: string;
  text: string;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TemplatesResponse {
  templates: Template[];
  categories: string[];
}

// ============================================================
// Settings Types
// ============================================================
export interface Setting {
  key: string;
  value: string | number | boolean;
  description?: string;
  updatedAt: string;
}

export interface Settings {
  [key: string]: string | number | boolean;
}

export interface SettingsResponse {
  settings: Settings;
}
>>>>>>> f0e33cb (Atualização correções)
