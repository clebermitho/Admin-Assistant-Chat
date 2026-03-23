// ============================================================
// CONSTANTES DA APLICAÇÃO - PRODUÇÃO
// ============================================================

// ============================================================
// Route paths
// ============================================================
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

// ============================================================
// API BASE URL - BACKEND NO RENDER
// ✅ URL DO BACKEND (Node.js/Express): https://backend-assistant-0x1d.onrender.com
// ⚠️  NÃO usar a URL do admin aqui — o admin chama o backend, não a si mesmo
// ============================================================
export const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string) ||
  'https://backend-assistant-0x1d.onrender.com';

// ============================================================
// Categorias de sugestões (espelha o backend)
// ============================================================
export const SUGGESTION_CATEGORIES = [
  'NEGOCIACAO',
  'SUSPENSAO',
  'CANCELAMENTO',
  'DUVIDA',
  'RECLAMACAO',
  'OUTROS',
] as const;

export type SuggestionCategory = typeof SUGGESTION_CATEGORIES[number];

// ============================================================
// Papéis de usuário
// ============================================================
export const USER_ROLES = ['ADMIN', 'AGENT'] as const;
export type UserRole = typeof USER_ROLES[number];

// ============================================================
// Log de configuração
// ============================================================
console.log('🌐 API Base URL (backend):', API_BASE_URL);
console.log('🔧 Ambiente:', import.meta.env.MODE);
console.log('🚀 Admin URL:', 'https://assistant-chat-if83.onrender.com');
