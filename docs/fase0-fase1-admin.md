# Admin-Assistant-Chat — Fase 0 (Diagnóstico) e Fase 1 (Arquitetura Alvo)

> **Repositório:** `clebermitho/Admin-Assistant-Chat`  
> **Produto:** Chatplay Assistant — painel administrativo  
> **Versão do documento:** 1.0.0  
> **Data:** 2026-04-02  

---

## Índice

1. [Diagnóstico "as-is" do repositório (Fase 0)](#1-diagnóstico-as-is-do-repositório-fase-0)
2. [Arquitetura alvo "to-be" do Admin (Fase 1)](#2-arquitetura-alvo-to-be-do-admin-fase-1)
3. [Inventário dos contratos atuais consumidos](#3-inventário-dos-contratos-atuais-consumidos)
4. [Contratos-alvo e boundary frontend / backend](#4-contratos-alvo-e-boundary-frontend--backend)
5. [Resumo Antes × Depois](#5-resumo-antes--depois)
6. [Decisões técnicas e trade-offs](#6-decisões-técnicas-e-trade-offs)
7. [Riscos e mitigação](#7-riscos-e-mitigação)
8. [Comandos de teste executados e resultados](#8-comandos-de-teste-executados-e-resultados)
9. [Pendências com prioridade](#9-pendências-com-prioridade)

---

## 1. Diagnóstico "as-is" do repositório (Fase 0)

### 1.1 Stack e versões

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Linguagem | TypeScript | 5.5.3 |
| UI Framework | React | 18.3.1 |
| Build Tool | Vite | 5.4.1 |
| Estilo | Tailwind CSS | 4.0.0 |
| Componentes | Shadcn/ui + Radix UI | variadas |
| Roteamento | React Router DOM | 6.26.2 |
| Ícones | Lucide React | 0.462.0 |
| Testes | Vitest + Testing Library | 3.0.0 / 16.1.0 |
| HTTP | Fetch API nativa | — |

### 1.2 Estrutura de módulos e arquivos principais

```
src/
├── api/
│   └── client.ts          # Cliente HTTP centralizado (408 linhas)
├── context/
│   └── AuthContext.tsx     # Provedor de autenticação (105 linhas)
├── components/
│   ├── AdminLayout.tsx     # Layout com sidebar
│   ├── ProtectedRoute.tsx  # Guard de rota
│   ├── SharedUI.tsx        # Componentes compartilhados (skeletons, erros, cards)
│   └── ui/                 # 50+ componentes Shadcn/Radix
├── pages/                  # 11 páginas (~3 700 linhas total)
│   ├── Dashboard.tsx
│   ├── Analytics.tsx
│   ├── Users.tsx / UserDetail.tsx
│   ├── Suggestions.tsx
│   ├── Templates.tsx
│   ├── Prompts.tsx
│   ├── Events.tsx
│   ├── Settings.tsx
│   └── Login.tsx
├── hooks/__tests__/        # Apenas teste de hook mobile
├── lib/
│   ├── constants.ts        # API_BASE_URL, ROUTE_PATHS, CATEGORIES
│   ├── index.ts
│   └── utils.ts            # cn() e helpers de data/formatação
├── types/
│   └── index.ts            # Interfaces TypeScript (177 linhas)
└── test/
    ├── setup.ts
    └── test-utils.tsx
```

### 1.3 Fluxos principais

#### Fluxo de autenticação
```
Login page
  → authApi.login(identifier, password)
  → POST /api/auth/login
  → Armazena token + refreshToken no localStorage
  → AuthContext.login() atualiza estado global
  → Redirect para /dashboard
```

#### Fluxo de requisição autenticada (qualquer página)
```
Page mount → useEffect
  → apiModule.method()
  → request(path, options) [src/api/client.ts]
    → Adiciona Bearer token do localStorage
    → Timeout de 30 s via AbortSignal
    → Se 401 + refreshToken → doRefresh() → POST /api/auth/refresh
      → sucesso: repete request com novo token
      → falha: clearTokens() + redirect para /login
    → Retorna JSON tipado
  → setState com data / error / loading
```

#### Fluxo de configurações (Settings + Prompts)
```
Settings page mount
  → settingsApi.list() + quotaApi.get()
  → Renderiza formulário controlado (useState por grupo)
  → Usuário edita campos
  → "Salvar" → settingsApi.bulkUpdate(payload)
    → Tenta PUT /api/settings/bulk
    → Fallback: PUT individual /api/settings/:key para cada chave
```

### 1.4 Dependências e integrações externas

| Dependência | Tipo | Observação |
|-------------|------|-----------|
| Backend Chatplay (`backend-assistant-0x1d.onrender.com`) | HTTP REST | Toda lógica de dados e negócios |
| Supabase | Preparado mas desativado | Código comentado em `constants.ts` |
| OpenAI (indireta) | Via backend | Painel configura modelo/temperatura, não chama OpenAI diretamente |
| Render.com (free tier) | Hospedagem backend | Cold-start considerado no client |

### 1.5 Problemas identificados

#### A. Gestão de estado e dados

| # | Problema | Severidade | Arquivo(s) |
|---|---------|-----------|-----------|
| A1 | Não há cache de dados entre navegações — cada rota dispara fetch do zero | Médio | todas as pages |
| A2 | Estado local duplicado em cada página (padrão `[data, isLoading, error]` repetido ≥ 8 vezes) | Médio | `pages/*.tsx` |
| A3 | Ausência de hook `useData` ou React Query — lógica de loading/retry misturada com UI | Médio | `pages/*.tsx` |
| A4 | Sem stale-while-revalidate — usuário sempre vê tela em branco durante fetch | Baixo | — |

#### B. Segurança

| # | Problema | Severidade | Arquivo(s) |
|---|---------|-----------|-----------|
| B1 | Tokens (`chatplay_token`, `chatplay_refresh_token`) armazenados em `localStorage` — vulneráveis a XSS | Alto | `api/client.ts` |
| B2 | `console.log` expõe API_BASE_URL, modo e URL de origem no console de produção | Médio | `lib/constants.ts` |
| B3 | `tsconfig.json` tem `strictNullChecks: false` — pode mascarar erros de nulidade em tempo de compilação | Médio | `tsconfig.json` |
| B4 | Sem validação do lado cliente antes de enviar senhas ou dados críticos ao backend | Baixo | `pages/Users.tsx`, `pages/UserDetail.tsx` |
| B5 | Ausência de RBAC no frontend — qualquer usuário autenticado acessa todas as rotas protegidas | Médio | `App.tsx`, `ProtectedRoute.tsx` |

#### C. Acoplamento e arquitetura

| # | Problema | Severidade | Arquivo(s) |
|---|---------|-----------|-----------|
| C1 | `api/client.ts` combina transporte HTTP, lógica de retry/refresh e lógica de negócio em um único arquivo de 408 linhas | Alto | `api/client.ts` |
| C2 | Endpoints sem versionamento (`/api/...` sem `/v1`) — nenhuma garantia de compatibilidade | Alto | todos os endpoints |
| C3 | Lógica de normalização de respostas embutida no cliente API (`analyticsApi.overview`) | Médio | `api/client.ts` |
| C4 | Fallback de `bulkUpdate` → chamadas individuais sequenciais acoplado ao cliente API | Médio | `api/client.ts` |
| C5 | URL base hardcoded como fallback (`backend-assistant-0x1d.onrender.com`) | Médio | `lib/constants.ts` |
| C6 | Sem versão de API nem prefixo `/v1` — mudanças no backend podem quebrar silenciosamente | Alto | `api/client.ts` |

#### D. Observabilidade e auditoria

| # | Problema | Severidade | Arquivo(s) |
|---|---------|-----------|-----------|
| D1 | Sem logging estruturado no frontend — erros são `console.error(err)` sem contexto | Alto | `api/client.ts` |
| D2 | Sem traceId propagado nas requisições — impossível correlacionar ações do Admin com logs do backend | Alto | `api/client.ts` |
| D3 | Sem auditoria de ações críticas (criação de usuário, reset de senha, mudança de modelo de IA) | Alto | `pages/*.tsx` |
| D4 | Ausência de telas para monitorar execuções de IA (latência, custo, falhas) | Alto | ausente |
| D5 | Ausência de telas para experimentos A/B e métricas de qualidade de respostas | Alto | ausente |

#### E. UX e consistência

| # | Problema | Severidade | Arquivo(s) |
|---|---------|-----------|-----------|
| E1 | Padrão loading/error/success inconsistente — algumas páginas usam `Spinner`, outras `SkeletonBox`, outras não têm skeleton | Médio | `pages/*.tsx` |
| E2 | Sem mensagens de sucesso consistentes após operações de escrita (create/update/delete) | Médio | `pages/Users.tsx`, `pages/Templates.tsx` |
| E3 | Sem confirmação visual antes de ações destrutivas (ex: delete de template) em algumas páginas | Médio | `pages/Templates.tsx` |
| E4 | `Settings.tsx` e `Prompts.tsx` usam `bulkUpdate` mas não há feedback de campos individuais com erro | Baixo | — |

#### F. Cobertura de testes

| # | Problema | Severidade | Arquivo(s) |
|---|---------|-----------|-----------|
| F1 | Apenas 4 arquivos de teste — sem testes para as 9 páginas críticas de negócio | Alto | `pages/__tests__/` |
| F2 | `api/client.ts` (408 linhas) sem cobertura de teste nenhuma | Alto | — |
| F3 | Sem testes de integração ou E2E | Médio | — |

### 1.6 Lógica de negócio excessiva no frontend

As seguintes responsabilidades estão no frontend mas deveriam estar no backend:

| Responsabilidade | Localização atual | Localização correta |
|-----------------|------------------|-------------------|
| Normalização de respostas da API (`analyticsApi.overview`) | `api/client.ts` | Backend — retornar payload já normalizado |
| Fallback de bulkUpdate para chamadas individuais | `api/client.ts` | Backend — garantir suporte a bulk atomicamente |
| Cálculo de `quotaPercent` e `estimatedCostUsd` | `api/client.ts` (normalização de overview) | Backend — campo calculado no response |
| Decisão de exibir alerta de quota (≥90%) | `pages/Analytics.tsx` | Backend — retornar campo `quotaWarning: boolean` |
| Definição de defaults de prompts de sistema | `pages/Prompts.tsx` (hardcoded) | Backend — retornar junto com `settingsApi.list()` |
| Rate limit visual (contador de tentativas de login) | Parcialmente no frontend | Backend — retornar `remainingAttempts` no response de erro |

### 1.7 Necessidades de observabilidade e auditoria

O painel precisa das seguintes capacidades que **ainda não existem**:

1. **Monitor de execuções de IA** — status (sucesso/erro/timeout), latência por chamada, custo estimado em tokens.
2. **Gerenciador de prompts versionados** — criar versões, publicar, fazer rollback, ver histórico de mudanças.
3. **Gerenciador de fontes da base de conhecimento** — listar fontes, status de ingestão/indexação, progresso.
4. **Painel de experimentos A/B** — comparar métricas entre versões de prompt, definir critério de vencedor, promover/reverter.
5. **Log de auditoria de ações críticas** — quem fez o quê, quando, com payload antes/depois para criação de usuário, reset de senha, mudança de modelo, publicação de prompt.

---

## 2. Arquitetura alvo "to-be" do Admin (Fase 1)

### 2.1 Papel do Admin na arquitetura futura

O Admin evolui de **painel básico de configuração** para **plataforma de gestão operacional**, com quatro pilares:

| Pilar | Responsabilidade |
|-------|-----------------|
| **Configuração** | Gerenciar parâmetros do sistema (modelos, limites, prompts) |
| **Monitoramento** | Acompanhar saúde do sistema e execuções de IA em tempo real |
| **Auditoria** | Registrar e consultar ações críticas com quem/quando/o quê |
| **Operação** | Gerenciar usuários, fontes de conhecimento, templates e experimentos A/B |

O painel deve ser um **thin client de gestão**: toda lógica de negócio, cálculo e decisão fica no backend; o frontend apenas apresenta e coleta dados.

### 2.2 Diagrama textual do fluxo Admin → Backend /v1

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Admin Panel (React SPA)                             │
│                                                                             │
│  ┌──────────┐  ┌───────────┐  ┌──────────┐  ┌──────────┐  ┌───────────┐  │
│  │Dashboard │  │ Analytics │  │ AI Monitor│  │ Prompts  │  │Knowledge  │  │
│  │ /metrics │  │ /analytics│  │/ai/runs  │  │/prompts  │  │ Base /kb  │  │
│  └────┬─────┘  └─────┬─────┘  └────┬─────┘  └────┬─────┘  └─────┬─────┘  │
│       │              │             │              │               │        │
│  ┌────▼──────────────▼─────────────▼──────────────▼───────────────▼──────┐ │
│  │              src/api/client.ts (camada HTTP unificada)                │ │
│  │  • Bearer token (memória / httpOnly cookie na versão alvo)            │ │
│  │  • Retry automático em 401 com refresh token                          │ │
│  │  • Timeout padrão (30 s) e AbortController                            │ │
│  │  • X-Request-ID propagado em todas as requisições                     │ │
│  └────────────────────────────────┬──────────────────────────────────────┘ │
└───────────────────────────────────┼────────────────────────────────────────┘
                                    │ HTTPS
                                    ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                   Backend Chatplay /v1 (Node.js / Express)                │
│                                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  ┌─────────────┐ │
│  │ Auth & RBAC  │  │  Metrics /   │  │  AI Orchest.  │  │   Prompts   │ │
│  │ /v1/auth/... │  │  Analytics   │  │ /v1/ai/runs   │  │ /v1/prompts │ │
│  └──────────────┘  └──────────────┘  └───────────────┘  └─────────────┘ │
│                                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  ┌─────────────┐ │
│  │  Users &     │  │  Templates   │  │  Knowledge    │  │   Audit     │ │
│  │  Quotas      │  │  /v1/tmpl    │  │  Base /v1/kb  │  │ /v1/audit   │ │
│  └──────────────┘  └──────────────┘  └───────────────┘  └─────────────┘ │
│                                                                           │
└───────────────────────────────┬───────────────────────────────────────────┘
                                │
              ┌─────────────────┼──────────────────────┐
              ▼                 ▼                       ▼
   ┌──────────────────┐  ┌──────────────────┐  ┌───────────────────────┐
   │   OpenAI / LLM   │  │  Knowledge Base  │  │  Observability Stack  │
   │  (gpt-4o, etc.)  │  │  (pgvector / KB) │  │  (logs, metrics,      │
   │                  │  │                  │  │   traces, alertas)    │
   └──────────────────┘  └──────────────────┘  └───────────────────────┘
```

### 2.3 Responsabilidades por módulo/camada no frontend

#### Camada de dados (`src/api/`)

| Módulo | Responsabilidade | Fora de escopo |
|--------|-----------------|---------------|
| `client.ts` | Transporte HTTP: headers, timeout, retry em 401, AbortController | Lógica de negócio, normalização de resposta |
| `auth.ts` *(novo)* | Operações de autenticação (`login`, `logout`, `me`, `refresh`) | — |
| `metrics.ts` *(refactor)* | Busca de métricas e atividade | Cálculo de percentuais |
| `analytics.ts` *(refactor)* | Busca de analytics, uso por usuário, série temporal | Normalização de campos |
| `users.ts` *(refactor)* | CRUD de usuários | Validação de senha |
| `ai.ts` *(novo)* | Listagem de execuções IA, histórico de latência/custo | — |
| `prompts.ts` *(novo)* | CRUD de prompts versionados, publicação, rollback | — |
| `kb.ts` *(novo)* | Fontes da base de conhecimento, status de ingestão | — |
| `experiments.ts` *(novo)* | Experimentos A/B, métricas por versão | — |
| `audit.ts` *(novo)* | Log de auditoria de ações críticas | — |

#### Camada de contexto (`src/context/`)

| Contexto | Responsabilidade |
|----------|-----------------|
| `AuthContext.tsx` | Usuário autenticado, token em memória (migrar de localStorage), login/logout |
| `ToastContext.tsx` *(novo)* | Notificações de sucesso/erro consistentes em toda a aplicação |

#### Camada de hooks customizados (`src/hooks/`)

| Hook | Responsabilidade |
|------|-----------------|
| `useAsync<T>` *(novo)* | Padrão unificado `[data, isLoading, error, refetch]` — elimina duplicação |
| `useAuditLog` *(novo)* | Registra ações críticas antes de enviar ao backend |
| `useMobile` *(existente)* | Breakpoint responsive |

#### Camada de páginas (`src/pages/`)

| Página | Estado atual | Alvo |
|--------|-------------|------|
| `Dashboard` | Métricas gerais | + Alertas de saúde (quota crítica, falhas recentes) |
| `Analytics` | Uso de API | Mantém; aguarda endpoint `/v1` |
| `Users` / `UserDetail` | CRUD usuários | + RBAC de rota (verificar role antes de renderizar) |
| `Suggestions` | Lista sugestões | Mantém; baixa prioridade de mudança |
| `Templates` | CRUD templates | + Confirmação destrutiva consistente |
| `Prompts` | Edição de prompts brutos | Migrar para `PromptVersions` com lista de versões e rollback |
| `Settings` | Configurações gerais | Mantém estrutura; ajustar para `/v1/settings` |
| `Events` | Log de eventos | Substituir por `Audit` com filtros avançados |
| `AIMonitor` *(nova)* | — | Execuções de IA: status, latência, custo, falhas |
| `KnowledgeBase` *(nova)* | — | Fontes KB: status de ingestão, progresso, reindexação |
| `Experiments` *(nova)* | — | A/B: experimentos ativos, métricas, critério de vencedor |

### 2.4 Contratos-alvo consumidos pelo painel

> Os contratos abaixo são propostos para o backend `/v1`. Cada endpoint segue o padrão:
> - Payload de sucesso: `{ data: T, meta?: {...} }`
> - Payload de erro: `{ error: { code: string, message: string, details?: unknown, traceId: string } }`

#### 2.4.1 Monitoramento de execuções de IA

```
GET /v1/ai/runs
Query params:
  since: ISO8601
  until: ISO8601
  status: "success" | "error" | "timeout" | "fallback"
  model: string
  limit: number (max 100)
  cursor: string (paginação)

Response 200:
{
  "data": {
    "runs": [
      {
        "id": "uuid",
        "createdAt": "ISO8601",
        "model": "gpt-4o-mini",
        "status": "success",
        "latencyMs": 842,
        "inputTokens": 312,
        "outputTokens": 128,
        "estimatedCostUsd": 0.00042,
        "promptId": "uuid",
        "promptVersion": "3",
        "userId": "uuid",
        "fallbackTriggered": false,
        "errorCode": null
      }
    ],
    "cursor": "next_cursor_token"
  },
  "meta": {
    "total": 1540,
    "since": "ISO8601",
    "until": "ISO8601"
  }
}

GET /v1/ai/runs/stats
Query params: since, until
Response 200:
{
  "data": {
    "totalRuns": 1540,
    "successRate": 0.972,
    "avgLatencyMs": 831,
    "p95LatencyMs": 2100,
    "totalCostUsd": 4.83,
    "totalTokens": 184200,
    "fallbackRate": 0.021,
    "byModel": [
      { "model": "gpt-4o-mini", "runs": 1400, "avgLatencyMs": 720 },
      { "model": "gpt-4o", "runs": 140, "avgLatencyMs": 1480 }
    ]
  }
}
```

#### 2.4.2 Gerenciamento de prompts versionados

```
GET /v1/prompts
Response 200:
{
  "data": {
    "prompts": [
      {
        "id": "uuid",
        "name": "suggestion_prompt",
        "description": "Prompt principal de sugestão",
        "currentVersion": "5",
        "publishedVersion": "4",
        "updatedAt": "ISO8601"
      }
    ]
  }
}

GET /v1/prompts/:id/versions
Response 200:
{
  "data": {
    "versions": [
      {
        "version": "5",
        "content": "Você é um assistente...",
        "variables": ["{{BASE_COREN}}", "{{CONTEXT}}", "{{QUESTION}}"],
        "status": "draft",
        "createdAt": "ISO8601",
        "createdBy": "uuid",
        "changelog": "Adicionado contexto de COREN",
        "metrics": null
      },
      {
        "version": "4",
        "content": "...",
        "status": "published",
        "metrics": {
          "successRate": 0.94,
          "avgLatencyMs": 830,
          "totalRuns": 1200
        }
      }
    ]
  }
}

POST /v1/prompts/:id/versions
Body: { "content": string, "changelog": string }
Response 201: { "data": { "version": VersionObject } }

POST /v1/prompts/:id/versions/:version/publish
Response 200: { "data": { "publishedVersion": "5" } }

POST /v1/prompts/:id/versions/:version/rollback
Response 200: { "data": { "publishedVersion": "3" } }
```

#### 2.4.3 Gerenciamento de fontes da base de conhecimento

```
GET /v1/kb/sources
Response 200:
{
  "data": {
    "sources": [
      {
        "id": "uuid",
        "name": "Manual COREN SP",
        "type": "pdf",
        "url": "https://...",
        "status": "indexed",
        "chunkCount": 342,
        "indexedAt": "ISO8601",
        "version": "2",
        "hash": "sha256:...",
        "metadata": { "category": "regulamentacao", "year": 2024 }
      }
    ]
  }
}

POST /v1/kb/sources/:id/reindex
Response 202: { "data": { "jobId": "uuid", "status": "queued" } }

GET /v1/kb/sources/:id/status
Response 200:
{
  "data": {
    "status": "indexing",
    "progress": 0.62,
    "processedChunks": 214,
    "totalChunks": 342,
    "startedAt": "ISO8601",
    "estimatedCompletionAt": "ISO8601"
  }
}

DELETE /v1/kb/sources/:id
Response 200: { "data": { "ok": true } }
```

#### 2.4.4 Experimentos A/B e métricas de qualidade

```
GET /v1/experiments
Response 200:
{
  "data": {
    "experiments": [
      {
        "id": "uuid",
        "name": "v4 vs v5 suggestion prompt",
        "status": "running",
        "promptId": "uuid",
        "variantA": { "version": "4", "trafficPercent": 50 },
        "variantB": { "version": "5", "trafficPercent": 50 },
        "startedAt": "ISO8601",
        "metrics": {
          "variantA": {
            "runs": 620,
            "successRate": 0.94,
            "avgLatencyMs": 820,
            "approvalRate": 0.73
          },
          "variantB": {
            "runs": 618,
            "successRate": 0.96,
            "avgLatencyMs": 795,
            "approvalRate": 0.81
          }
        }
      }
    ]
  }
}

POST /v1/experiments
Body:
{
  "name": string,
  "promptId": string,
  "variantA": { "version": string, "trafficPercent": number },
  "variantB": { "version": string, "trafficPercent": number }
}
Response 201: { "data": { "experiment": ExperimentObject } }

POST /v1/experiments/:id/conclude
Body: { "winner": "A" | "B", "reason": string }
Response 200: { "data": { "status": "concluded", "winner": "B" } }
```

#### 2.4.5 Auditoria de ações críticas

```
GET /v1/audit/logs
Query params:
  since: ISO8601
  until: ISO8601
  actorId: uuid
  action: string (ex: "user.create", "prompt.publish", "settings.update")
  limit: number
  cursor: string

Response 200:
{
  "data": {
    "logs": [
      {
        "id": "uuid",
        "createdAt": "ISO8601",
        "actor": { "id": "uuid", "name": "Admin João", "role": "ADMIN" },
        "action": "prompt.publish",
        "resourceType": "prompt",
        "resourceId": "uuid",
        "before": { "publishedVersion": "3" },
        "after": { "publishedVersion": "5" },
        "traceId": "trace-uuid",
        "ipAddress": "203.0.113.x"
      }
    ],
    "cursor": "next_cursor"
  }
}
```

### 2.5 Plano de migração e compatibilidade

Como os endpoints atuais não têm versionamento (`/api/...`), a migração para `/v1` será executada em duas fases:

| Fase | Estratégia | Duração estimada |
|------|-----------|-----------------|
| **Migração A** | Backend disponibiliza `/v1` em paralelo com `/api` (ambos ativos) | Sprint 1-2 do Backend |
| **Migração B** | Frontend atualiza `client.ts` de `/api` para `/v1` por módulo (Auth → Users → Settings → novos endpoints) | Sprint 3 do Admin |
| **Deprecação** | Após validação em produção, desativar endpoints `/api` legados com aviso de 30 dias | Sprint 4 |

**Breaking changes identificados:**

| Endpoint atual | Mudança em `/v1` | Impacto | Mitigação |
|---------------|-----------------|---------|-----------|
| `/api/analytics/overview` | Resposta normalizada retornada diretamente (sem normalização no client) | Alto | Manter normalização no client até backend entregar campo calculado |
| `/api/settings/bulk` | Operação atômica garantida (sem fallback para chamadas individuais) | Médio | Remover fallback no client após confirmar suporte em `/v1` |
| `/api/events/recent` | Substituído por `/v1/audit/logs` com filtros avançados | Alto | Manter `eventsApi` funcional durante transição; redirecionar UI gradualmente |
| `/api/prompts` *(inexistente)* | Novo em `/v1/prompts` com versionamento | Adição | Sem breaking change — nova funcionalidade |
| `/api/ai/runs` *(inexistente)* | Novo em `/v1/ai/runs` | Adição | Sem breaking change — nova funcionalidade |

---

## 3. Inventário dos contratos atuais consumidos

### 3.1 Autenticação

| Método | Endpoint | Request Body | Response (sucesso) | Auth |
|--------|---------|-------------|-------------------|------|
| POST | `/api/auth/login` | `{ email?: string, username?: string, password: string }` | `{ token, refreshToken, expiresAt, refreshExpiresAt, user: User }` | Não |
| GET | `/api/auth/me` | — | `{ user: User }` | Bearer |
| POST | `/api/auth/logout` | — | `{ ok: boolean }` | Bearer |
| POST | `/api/auth/refresh` | `{ refreshToken: string }` | `{ token, refreshToken, expiresAt }` | Não |

### 3.2 Métricas

| Método | Endpoint | Query | Response (sucesso) | Auth |
|--------|---------|-------|-------------------|------|
| GET | `/api/metrics/summary` | `since?: ISO8601` | `MetricsSummaryResponse` | Bearer |
| GET | `/api/metrics/activity` | `days?: number` | `{ days: number, activity: Record<string, Record<string, number>> }` | Bearer |

### 3.3 Usuários

| Método | Endpoint | Payload | Response | Auth |
|--------|---------|---------|---------|------|
| GET | `/api/users` | — | `{ users: User[] }` | Bearer |
| GET | `/api/users/:id` | — | `{ user: User & { stats?: Record<string, unknown> } }` | Bearer |
| POST | `/api/users` | `{ name, email?, username?, password, role }` | `{ user: User }` | Bearer |
| PATCH | `/api/users/:id` | `{ isActive?, role?, name?, dailyChatLimit?, dailySuggestionLimit? }` | `{ user: User }` | Bearer |
| POST | `/api/users/:id/reset-password` | `{ newPassword: string }` | `{ ok: boolean, message: string }` | Bearer |

### 3.4 Sugestões e Feedback

| Método | Endpoint | Query | Response | Auth |
|--------|---------|-------|---------|------|
| GET | `/api/suggestions` | `category?: string, limit?: number` | `{ suggestions: Suggestion[] }` | Bearer |
| GET | `/api/feedback/rejected` | — | `{ rejected: RejectedFeedback[] }` | Bearer |

### 3.5 Templates

| Método | Endpoint | Payload | Response | Auth |
|--------|---------|---------|---------|------|
| GET | `/api/templates` | `category?: string` | `{ templates: Template[] }` | Bearer |
| POST | `/api/templates` | `{ category: string, text: string }` | `{ id, category, text }` | Bearer |
| DELETE | `/api/templates/:id` | — | `{ ok: boolean }` | Bearer |

### 3.6 Configurações

| Método | Endpoint | Payload | Response | Auth |
|--------|---------|---------|---------|------|
| GET | `/api/settings` | — | `{ settings: Record<string, SettingValue> }` | Bearer |
| PUT | `/api/settings/:key` | `{ value: string \| number \| boolean }` | `{ key, value }` | Bearer |
| PUT | `/api/settings/bulk` | `{ settings: Record<string, string \| number \| boolean> }` | `{ saved: number, settings: Record<string, unknown> }` | Bearer |

### 3.7 Quota

| Método | Endpoint | Payload | Response | Auth |
|--------|---------|---------|---------|------|
| GET | `/api/quota` | — | `{ period, organization, monthlyQuota, usedTokens, remaining }` | Bearer |
| PUT | `/api/quota` | `{ monthlyQuota?: number, resetUsedTokens?: boolean }` | mesmo objeto | Bearer |

### 3.8 Analytics

| Método | Endpoint | Query | Response | Auth |
|--------|---------|-------|---------|------|
| GET | `/api/analytics/overview` | — | `AnalyticsOverviewResponse` (normalizado no client) | Bearer |
| GET | `/api/analytics/usage-per-user` | `since?: ISO8601` | `{ users: UserUsageRecord[] }` | Bearer |
| GET | `/api/analytics/usage-over-time` | `since?: ISO8601, granularity?: 'day'` | `{ data: UsageDataPoint[] }` | Bearer |

### 3.9 Eventos

| Método | Endpoint | Query | Response | Auth |
|--------|---------|-------|---------|------|
| GET | `/api/events/recent` | `filter?: 'errors'\|'ai'\|'auth', limit?: number` | `{ events, summary24h }` | Bearer |
| GET | `/api/events` | `eventType?: string, userId?: string, limit?: number` | `{ events, total }` | Bearer |

### 3.10 Formato de erro atual

```json
{
  "error": "Mensagem de erro",
  "message": "Detalhe opcional",
  "status": 400
}
```

**Ausências críticas no contrato atual:**
- Sem `traceId` nos erros
- Sem `code` de erro padronizado (ex: `AUTH_EXPIRED`, `QUOTA_EXCEEDED`)
- Sem versionamento nos endpoints
- Sem paginação padronizada com cursor em endpoints de lista

---

## 4. Contratos-alvo e boundary frontend / backend

### 4.1 Boundary de responsabilidades

```
┌──────────────────────────────────────────────────────┐
│                   FRONTEND (Admin SPA)               │
│                                                      │
│  ✅ DEVE FAZER                                       │
│  • Apresentar dados recebidos do backend             │
│  • Coletar e validar entradas do usuário (formato)   │
│  • Gerenciar estado de UI (loading/error/success)    │
│  • Propagar X-Request-ID em todas as requisições     │
│  • Registrar ações críticas via /v1/audit/logs       │
│  • Controle de acesso de rota baseado em role        │
│                                                      │
│  ❌ NÃO DEVE FAZER                                   │
│  • Normalizar / transformar respostas de API         │
│  • Calcular métricas derivadas (custo, percentual)   │
│  • Implementar fallback de lógica de negócio         │
│  • Armazenar segredos ou tokens de longa duração     │
│  • Definir defaults de prompts hardcoded             │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│                BACKEND (Chatplay /v1)                │
│                                                      │
│  ✅ DEVE FAZER                                       │
│  • Retornar dados calculados e normalizados          │
│  • Garantir atomicidade em operações bulk            │
│  • Controlar RBAC (verificar permissões no servidor) │
│  • Emitir traceId em todas as respostas              │
│  • Fornecer endpoints novos para IA, prompts,        │
│    KB e auditoria                                    │
│  • Rate limiting e proteção contra abuso             │
│                                                      │
│  ❌ NÃO DEVE FAZER                                   │
│  • Confiar em validações de RBAC só do frontend      │
│  • Retornar payloads que requerem cálculo no client  │
└──────────────────────────────────────────────────────┘
```

### 4.2 Formato padrão de resposta alvo (`/v1`)

**Sucesso:**
```json
{
  "data": { "..." },
  "meta": {
    "total": 100,
    "cursor": "next_cursor",
    "since": "ISO8601",
    "until": "ISO8601"
  }
}
```

**Erro:**
```json
{
  "error": {
    "code": "QUOTA_EXCEEDED",
    "message": "Cota mensal excedida.",
    "details": { "used": 10000, "quota": 9500 },
    "traceId": "trace-abc123"
  }
}
```

### 4.3 Cabeçalhos padrão alvo

```
Authorization: Bearer {token}
Content-Type: application/json
X-Request-ID: {uuid-v4}       ← gerado pelo cliente, propagado pelo backend
Accept: application/json
```

### 4.4 Migração do armazenamento de tokens

| Atual | Alvo | Justificativa |
|-------|------|--------------|
| `localStorage` | `httpOnly Cookie` (sessão) + token em memória | Eliminar vulnerabilidade a XSS; `httpOnly` impede acesso via JS |
| Refresh token em `localStorage` | `httpOnly Cookie` com `SameSite=Strict` | Mesmo motivo |

**Plano de migração de tokens:**
1. Backend implementa Set-Cookie com `httpOnly` no login (Fase 2 Backend).
2. Frontend atualiza `doRefresh()` para não enviar `refreshToken` no body — cookie é enviado automaticamente.
3. `clearTokens()` passa a chamar endpoint de logout (que limpa cookie server-side).
4. Remover referências a `localStorage` para tokens.

---

## 5. Resumo Antes × Depois

| Dimensão | Antes (as-is) | Depois (to-be) |
|----------|--------------|---------------|
| **Endpoints** | `/api/*` sem versão | `/v1/*` versionado e padronizado |
| **Autenticação** | Token em `localStorage` (XSS-vulnerável) | Token em memória + `httpOnly` cookie |
| **Estado** | `useState` replicado em cada página | Hook `useAsync<T>` unificado |
| **Erros** | `{ error, message, status }` sem traceId | `{ error: { code, message, details, traceId } }` |
| **Lógica de negócio** | Normalização e fallback no frontend | Tudo no backend; frontend só apresenta |
| **Monitoramento de IA** | Ausente | Tela `AIMonitor` — latência, custo, falhas, modelo |
| **Prompts** | Edição de texto bruto sem versão | `PromptVersions` — criar versão, publicar, rollback |
| **Base de conhecimento** | Ausente no Admin | Tela `KnowledgeBase` — fontes, status de ingestão |
| **Experimentos A/B** | Ausente | Tela `Experiments` — comparar métricas, concluir |
| **Auditoria** | Log de eventos simples | `/v1/audit/logs` com actor, before/after, traceId |
| **RBAC no frontend** | Sem controle de role por rota | Verificação de role em `ProtectedRoute` |
| **Observabilidade** | `console.error` sem contexto | `X-Request-ID` em todas as requisições |
| **Testes** | 4 arquivos (Login, NotFound, ProtectedRoute, useMobile) | + testes para `useAsync`, `api/client`, páginas críticas |
| **console.log em produção** | URLs e modo expostos | Removido ou protegido por `import.meta.env.DEV` |

---

## 6. Decisões técnicas e trade-offs

### D1 — Manter Fetch API nativa vs adotar React Query / SWR

**Decisão:** Introduzir hook `useAsync<T>` próprio no curto prazo; avaliar React Query apenas se a complexidade de cache/mutation justificar na Fase 3.

**Justificativa:**
- O painel tem volume de dados modesto — sem necessidade de cache agressivo imediato.
- React Query adicionaria ~13 KB gzipped e uma curva de adoção.
- `useAsync<T>` elimina a duplicação de padrão loading/error sem nova dependência.

**Trade-off:** Se o painel evoluir para polling de execuções em tempo real (AI Monitor), React Query com `useQuery` + `refetchInterval` será a melhor solução — reavaliar na Fase 3.

### D2 — Separação do `api/client.ts` em módulos por domínio

**Decisão:** Dividir em módulos independentes (`auth.ts`, `users.ts`, `ai.ts`, `prompts.ts`, etc.) na Fase 3, mantendo `client.ts` como utilitário de transporte.

**Justificativa:**
- Arquivo de 408 linhas mistura transporte, lógica de negócio e normalização.
- Separação facilita testes unitários por domínio.

**Trade-off:** Breaking change interno — todas as importações de `@/api/client` precisarão ser atualizadas. Mitigação: manter re-exports em `client.ts` durante transição.

### D3 — `httpOnly` cookies vs localStorage para tokens

**Decisão:** Migrar para `httpOnly` cookie coordenado com a Fase 2 do Backend.

**Justificativa:** XSS em SPA React pode roubar tokens do `localStorage`; `httpOnly` torna isso impossível via JS.

**Trade-off:** Requer suporte do backend (Set-Cookie no login/logout). CORS precisa de `credentials: 'include'`. Sem migração do backend, manter `localStorage` com Content-Security-Policy rígida como mitigação parcial.

### D4 — Não adicionar Redux / Zustand agora

**Decisão:** AuthContext permanece como única store global; estado de página fica local.

**Justificativa:** O painel não tem estado compartilhado complexo entre rotas. Zustand seria overengineering no estágio atual.

**Trade-off:** Se novas páginas precisarem compartilhar estado (ex: AI Monitor exibindo alertas no Dashboard), avaliar Zustand com slices por domínio.

### D5 — `X-Request-ID` gerado no cliente vs no servidor

**Decisão:** Gerado no cliente (`crypto.randomUUID()`) e propagado ao backend via header.

**Justificativa:** Permite correlacionar ação do Admin com log do backend desde o início, sem esperar o backend emitir. Frontend pode logar o mesmo ID para rastreabilidade.

**Trade-off:** Se o browser não suportar `crypto.randomUUID()`, cai em `Math.random()` como fallback.

---

## 7. Riscos e mitigação

| # | Risco | Probabilidade | Impacto | Mitigação |
|---|-------|--------------|---------|-----------|
| R1 | Backend não entregar `/v1` antes da Fase 3 do Admin | Média | Alto | Manter `/api` funcionando; Admin continua com endpoints legados até `/v1` estar disponível |
| R2 | `localStorage` de tokens explorado por XSS | Baixa (sem XSS conhecido) | Alto | Implementar CSP rigorosa imediatamente; migrar para `httpOnly` cookie na Fase 2 |
| R3 | `console.log` expondo informações em produção | Alta (já acontece) | Médio | Substituir por guard `if (import.meta.env.DEV)` — mudança de baixo risco e alta prioridade |
| R4 | Endpoints sem versionamento quebram com mudanças no backend | Alta | Alto | Coordenar versionamento `/v1` com equipe de backend antes de qualquer mudança de contrato |
| R5 | Ausência de RBAC no frontend permite acesso visual indevido | Média | Médio | Adicionar verificação de role em `ProtectedRoute` nas próximas fases (autorização real é do backend) |
| R6 | Testes insuficientes — regressão em páginas críticas | Alta | Alto | Adicionar testes para `api/client`, `useAsync`, páginas `Users` e `Settings` na Fase 3 |
| R7 | Novas telas (AI Monitor, KB, Experiments) dependem de novos endpoints do backend | Alta | Alto | Desenvolver com mocks durante Fase 3; ativar contra backend real após Fase 2 concluída |
| R8 | Remoção de `console.log` e mudança de `localStorage` sem testes pode regredir fluxo de login | Baixa | Alto | Adicionar testes de integração do fluxo de autenticação antes de qualquer mudança no `client.ts` |

---

## 8. Comandos de teste executados e resultados

### Ambiente de execução

```
Node.js: v24.14.1
npm: 10.x
OS: Linux (GitHub Codespace / Sandbox)
```

### Resultado da instalação de dependências

```bash
$ npm install
# Status: parcial — node_modules presentes mas vite não executável
# Razão: ambiente sandbox com restrições de instalação de pacotes nativos
```

### Tentativa de execução dos testes

```bash
$ npm run test
# Error: sh: 1: vitest: not found
# Causa: vite/vitest binários não instalados corretamente no ambiente sandbox

$ node node_modules/vitest/vitest.mjs run
# Error: Cannot find package 'vite/index.js'
# Causa: dependência transitória vite não disponível no ambiente
```

### Verificação estática realizada (sem execução)

Como os testes não puderam ser executados no ambiente sandbox, foram realizadas as seguintes verificações manuais:

| Verificação | Resultado |
|------------|-----------|
| Estrutura de arquivos de teste presentes | ✅ `ProtectedRoute.test.tsx`, `Login.test.tsx`, `NotFound.test.tsx`, `use-mobile.test.tsx` |
| Configuração de Vitest em `vite.config.ts` | ✅ Correto (`environment: 'jsdom'`, `setupFiles`, `globals: true`) |
| `test-utils.tsx` com wrapper de `BrowserRouter` | ✅ Presente |
| Imports de testes consistentes com estrutura de código | ✅ Verificado manualmente |
| TypeScript válido nos arquivos de teste | ✅ Sem erros de sintaxe identificados |

### Comando para executar localmente (ambiente com dependências completas)

```bash
# Instalar dependências
npm install

# Executar todos os testes
npm run test

# Executar com cobertura
npm run test:coverage

# Lint e verificação de tipos
npm run lint
npx tsc --noEmit -p tsconfig.app.json

# Build de produção
npm run build
```

### Resultado esperado dos testes existentes

Com base na análise do código-fonte, os 4 arquivos de teste devem passar:
- `ProtectedRoute.test.tsx` — testa redirect para login quando não autenticado
- `Login.test.tsx` — testa render, validação de campos, mensagem de erro
- `NotFound.test.tsx` — testa render do componente 404
- `use-mobile.test.tsx` — testa hook de detecção de breakpoint

---

## 9. Pendências com prioridade

### Prioridade CRÍTICA (fazer antes de qualquer nova feature)

| ID | Pendência | Esforço | Fase |
|----|---------|---------|------|
| P1 | Remover `console.log` de produção em `lib/constants.ts` (B2) | 30 min | Imediato |
| P2 | Adicionar `X-Request-ID` em todas as requisições do `client.ts` (D2) | 2h | Fase 3 |
| P3 | Criar hook `useAsync<T>` e refatorar páginas para eliminar duplicação (A2/A3) | 1 dia | Fase 3 |

### Prioridade ALTA (próximo sprint — Fase 3 Admin)

| ID | Pendência | Esforço | Fase |
|----|---------|---------|------|
| P4 | Coordenar com backend o versionamento `/v1` dos endpoints existentes (C2/C6) | — | Backend primeiro |
| P5 | Adicionar RBAC de rota no `ProtectedRoute` (B5) | 4h | Fase 3 |
| P6 | Adicionar testes para `api/client.ts` — fluxo de login, refresh e erro (F2) | 1 dia | Fase 3 |
| P7 | Adicionar testes para páginas `Users` e `Settings` (F1) | 1 dia | Fase 3 |
| P8 | Migrar `analyticsApi.overview` — remover normalização do client após backend retornar campos calculados (C3) | 2h | Fase 3 (pós Backend) |

### Prioridade MÉDIA (backlog — Fase 3 Admin avançada)

| ID | Pendência | Esforço | Fase |
|----|---------|---------|------|
| P9 | Implementar tela `AIMonitor` (D4) — depende de `/v1/ai/runs` no backend | 3 dias | Fase 3 |
| P10 | Implementar tela `PromptVersions` (D4) — depende de `/v1/prompts` no backend | 2 dias | Fase 3 |
| P11 | Implementar tela `KnowledgeBase` (D4) — depende de `/v1/kb/sources` no backend | 2 dias | Fase 3 |
| P12 | Implementar tela `Experiments` (D4) — depende de `/v1/experiments` no backend | 2 dias | Fase 3 |
| P13 | Migrar tokens de `localStorage` para `httpOnly` cookie (B1) — depende de backend | 4h | Fase 3 (pós Backend) |
| P14 | Habilitar `strictNullChecks: true` no `tsconfig.json` e corrigir erros (B3) | 2 dias | Fase 3 |

### Prioridade BAIXA (melhorias futuras)

| ID | Pendência | Esforço | Fase |
|----|---------|---------|------|
| P15 | Adicionar `ToastContext` para notificações de sucesso/erro consistentes (E2) | 4h | Fase 3 |
| P16 | Confirmação modal antes de ações destrutivas em `Templates` (E3) | 2h | Fase 3 |
| P17 | Avaliar React Query para páginas com polling (AI Monitor) — se necessário (D1) | 2 dias | Fase 3+ |
| P18 | Internacionalização (i18n) — textos hardcoded em PT-BR | 3 dias | Fase 5+ |

---

*Documento produzido como base executiva/técnica para as Fases 3+ do programa de modernização do Admin-Assistant-Chat.*
