// ============================================================
// API Types — Chatplay Assistant Admin
// ============================================================

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'AGENT';
  isActive: boolean;
  lastSeenAt: string | null;
  createdAt: string;
  organization?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// Metrics
export interface MetricsSummary {
  users: {
    total: number;
    active: number;
  };
  suggestions: {
    total: number;
    approvalRate: number;
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
}

export interface ActivityData {
  days: number;
  activity: Record<string, Record<string, number>>;
}

// Suggestions
export interface Suggestion {
  id: string;
  text: string;
  score: number;
  usageCount: number;
  category?: string;
}

export interface RejectedFeedback {
  id: string;
  suggestion: {
    text: string;
    category: string;
  };
  reason: string;
  createdAt: string;
}

// Templates
export interface Template {
  id: string;
  category: string;
  text: string;
  score: number;
  usageCount: number;
}

// Settings
export interface Settings {
  [key: string]: string | number | boolean;
}

// API Response wrappers
export interface UsersResponse {
  users: User[];
}

export interface SuggestionsResponse {
  suggestions: Suggestion[];
}

export interface RejectedFeedbackResponse {
  rejected: RejectedFeedback[];
}

export interface TemplatesResponse {
  templates: Template[];
}

export interface SettingsResponse {
  settings: Settings;
}

export interface MetricsSummaryResponse {
  users: MetricsSummary['users'];
  suggestions: MetricsSummary['suggestions'];
  feedback: MetricsSummary['feedback'];
  events: MetricsSummary['events'];
}
