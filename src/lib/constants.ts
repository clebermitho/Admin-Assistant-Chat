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
// 🔥 URL DO SEU BACKEND: https://assistant-chat-if83.onrender.com
// ============================================================

// URL fixa do backend no Render
export const API_BASE_URL: string = 'https://assistant-chat-if83.onrender.com';

// Se quiser usar variável de ambiente (recomendado para flexibilidade)
// export const API_BASE_URL: string = 
//   (import.meta.env.VITE_API_BASE_URL as string) || 'https://assistant-chat-if83.onrender.com';

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
console.log('🌐 API Base URL:', API_BASE_URL);
console.log('🔧 Ambiente:', import.meta.env.MODE);
console.log('🚀 Admin URL:', 'https://admin-assistant-chat.onrender.com');