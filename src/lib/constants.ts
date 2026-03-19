// Route paths
export const ROUTE_PATHS = {
  HOME:        '/',
  LOGIN:       '/login',
  DASHBOARD:   '/dashboard',
  USERS:       '/users',
  SUGGESTIONS: '/suggestions',
  TEMPLATES:   '/templates',
  SETTINGS:    '/settings',
  EVENTS:      '/events',
} as const;

// API base URL — usa VITE_API_BASE_URL ou vazio (proxy Vite em dev)
export const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string) || '';

// Categorias de sugestões (espelha o backend)
export const SUGGESTION_CATEGORIES = [
  'NEGOCIACAO',
  'SUSPENSAO',
  'CANCELAMENTO',
  'DUVIDA',
  'RECLAMACAO',
  'OUTROS',
] as const;

export type SuggestionCategory = typeof SUGGESTION_CATEGORIES[number];

// Papéis de usuário
export const USER_ROLES = ['ADMIN', 'AGENT'] as const;
export type UserRole = typeof USER_ROLES[number];
