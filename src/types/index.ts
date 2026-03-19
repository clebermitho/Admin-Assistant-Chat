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
  totalEvents: number;
  totalUsers: number;
  activeUsers24h: number;
  totalSuggestions: number;
  acceptedSuggestions: number;
  rejectedSuggestions: number;
  averageResponseTime?: number;
}

export interface ActivityData {
  dates: string[];
  events: number[];
  suggestions: number[];
  users: number[];
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

export interface RejectedFeedbackResponse {
  feedback: Array<{
    id: string;
    suggestionId: string;
    reason: string;
    comment?: string;
    createdAt: string;
    user?: {
      id: string;
      name: string;
    };
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

export interface SettingsResponse {
  settings: Setting[];
}