import { useEffect, useState, useCallback } from 'react';
import { Save, RefreshCw, ToggleLeft, ToggleRight } from 'lucide-react';
import { quotaApi, settingsApi } from '@/api/client';
import type { Settings } from '@/types';
import { Card, PageHeader, SkeletonBox, ErrorState, Spinner } from '@/components/SharedUI';

// ---- Setting row types ----
interface SettingField {
  key: string;
  label: string;
  description: string;
  type: 'text' | 'number' | 'toggle';
  min?: number;
  max?: number;
  step?: number;
}

// ── Grupos de configuração ──────────────────────────────────────
interface SettingGroup {
  label: string;
  fields: SettingField[];
}

const SETTING_GROUPS: SettingGroup[] = [
  {
    label: '🤖 Modelo de IA',
    fields: [
      {
        key: 'suggestion.model',
        label: 'Modelo OpenAI',
        description: 'Modelo usado para gerar sugestões (ex: gpt-4o-mini, gpt-4o).',
        type: 'text',
      },
      {
        key: 'suggestion.temperature',
        label: 'Temperatura',
        description: 'Criatividade das respostas — 0 = preciso, 1 = criativo.',
        type: 'number',
        min: 0,
        max: 2,
        step: 0.1,
      },
      {
        key: 'suggestion.maxTokens',
        label: 'Máximo de Tokens',
        description: 'Limite de tokens por resposta gerada.',
        type: 'number',
        min: 100,
        max: 4000,
        step: 50,
      },
    ],
  },
  {
    label: '📊 Limites por Usuário',
    fields: [
      {
        key: 'limits.suggestionsPerUserPerDay',
        label: 'Sugestões / usuário / dia',
        description: 'Limite padrão de sugestões por dia. Pode ser sobrescrito individualmente na página de cada usuário. 0 = ilimitado.',
        type: 'number',
        min: 0,
        max: 1000,
        step: 10,
      },
      {
        key: 'limits.chatMessagesPerUserPerDay',
        label: 'Mensagens chat IA / usuário / dia',
        description: 'Limite padrão de mensagens no chat IA por dia. Pode ser sobrescrito individualmente na página de cada usuário. 0 = ilimitado.',
        type: 'number',
        min: 0,
        max: 500,
        step: 10,
      },
      {
        key: 'limits.maxActiveSessions',
        label: 'Sessões simultâneas por agente',
        description: 'Número máximo de sessões ativas por usuário ao mesmo tempo.',
        type: 'number',
        min: 1,
        max: 10,
        step: 1,
      },
    ],
  },
  {
    label: '🔐 Sessão e Segurança',
    fields: [
      {
        key: 'auth.sessionDurationHours',
        label: 'Duração da sessão (horas)',
        description: 'Tempo em horas até o token de acesso expirar automaticamente.',
        type: 'number',
        min: 1,
        max: 720,
        step: 1,
      },
      {
        key: 'auth.maxLoginAttempts',
        label: 'Tentativas de login (rate limit)',
        description: 'Quantidade máxima de tentativas de login em 15 minutos antes do bloqueio.',
        type: 'number',
        min: 3,
        max: 20,
        step: 1,
      },
      {
        key: 'auth.requireStrongPassword',
        label: 'Senha forte obrigatória',
        description: 'Exige mínimo 8 caracteres, letra maiúscula e número ao criar/redefinir senha.',
        type: 'toggle',
      },
    ],
  },
  {
    label: '📚 Aprendizado e Qualidade',
    fields: [
      {
        key: 'suggestion.autoSuggest',
        label: 'Sugestões automáticas',
        description: 'Habilita a geração automática de sugestões na extensão (quando suportado).',
        type: 'toggle',
      },
      {
        key: 'suggestion.learnFromApproved',
        label: 'Aprender com Aprovadas',
        description: 'Usar sugestões aprovadas como exemplos para melhorar futuras respostas.',
        type: 'toggle',
      },
      {
        key: 'suggestion.filterRejected',
        label: 'Filtrar Reprovadas',
        description: 'Evitar gerar sugestões similares a respostas já reprovadas.',
        type: 'toggle',
      },
      {
        key: 'suggestion.minApprovalScoreToLearn',
        label: 'Score mínimo para aprender',
        description: 'Score mínimo (0–1) que uma sugestão precisa ter para ser adicionada como template.',
        type: 'number',
        min: 0,
        max: 1,
        step: 0.05,
      },
    ],
  },
  {
    label: '🧹 Limpeza e Retenção',
    fields: [
      {
        key: 'retention.historyDays',
        label: 'Retenção de histórico (dias)',
        description: 'Após quantos dias os registros de histórico são removidos automaticamente.',
        type: 'number',
        min: 7,
        max: 365,
        step: 7,
      },
      {
        key: 'retention.eventLogDays',
        label: 'Retenção de eventos (dias)',
        description: 'Após quantos dias os eventos de auditoria são removidos.',
        type: 'number',
        min: 7,
        max: 365,
        step: 7,
      },
      {
        key: 'retention.autoCleanRejected',
        label: 'Limpeza automática de reprovadas',
        description: 'Remove automaticamente sugestões reprovadas após o período de retenção.',
        type: 'toggle',
      },
    ],
  },
];

// Flatten para lookups por key
const SETTING_FIELDS: SettingField[] = SETTING_GROUPS.flatMap(g => g.fields);

// ---- Toggle field ----
function ToggleField({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="flex items-center gap-2 text-sm"
    >
      {value ? (
        <ToggleRight className="w-8 h-8 text-[#22c55e]" />
      ) : (
        <ToggleLeft className="w-8 h-8 text-muted-foreground" />
      )}
      <span className={value ? 'text-[#22c55e]' : 'text-muted-foreground'}>
        {value ? 'Ativado' : 'Desativado'}
      </span>
    </button>
  );
}

// ---- Main ----
export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({});
  const [localSettings, setLocalSettings] = useState<Settings>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [quota, setQuota] = useState<null | {
    period: string;
    monthlyQuota: number;
    usedTokens: number;
    remaining: number;
  }>(null);
  const [quotaMonthly, setQuotaMonthly] = useState<number | ''>('');
  const [quotaBusy, setQuotaBusy] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await settingsApi.list();
      setSettings(res.settings);
      setLocalSettings(res.settings);
      const q = await quotaApi.get().catch(() => null);
      if (q) {
        setQuota({ period: q.period, monthlyQuota: q.monthlyQuota, usedTokens: q.usedTokens, remaining: q.remaining });
        setQuotaMonthly(q.monthlyQuota);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar configurações.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleChange = (key: string, value: string | number | boolean) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      // Apenas chaves alteradas
      const changedKeys = Object.keys(localSettings).filter(
        (k) => localSettings[k] !== settings[k]
      );
      if (changedKeys.length === 0) {
        setSaving(false);
        return;
      }
      const changedSettings = Object.fromEntries(
        changedKeys.map((k) => [k, localSettings[k]])
      );
      // Bulk update preferido — fallback automático no client
      await settingsApi.bulkUpdate(changedSettings);
      setSettings(localSettings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = JSON.stringify(localSettings) !== JSON.stringify(settings);

  if (error) {
    return (
      <div>
        <PageHeader title="Configurações" description="Parâmetros do sistema AssistentePlay" />
        <ErrorState message={error} onRetry={load} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Configurações"
        description="Parâmetros do sistema e modelo de IA"
        action={
          <div className="flex items-center gap-2">
            {saved && (
              <span className="text-xs text-[#22c55e]">✓ Salvo com sucesso</span>
            )}
            <button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? <Spinner size="sm" /> : <Save className="w-4 h-4" />}
              Salvar
            </button>
          </div>
        }
      />

      <div className="max-w-2xl">
        {isLoading ? (
          <Card className="p-6 space-y-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <SkeletonBox className="h-4 w-1/3" />
                <SkeletonBox className="h-3 w-2/3" />
                <SkeletonBox className="h-9 w-full" />
              </div>
            ))}
          </Card>
        ) : (
          <div className="space-y-6">
            {SETTING_GROUPS.map((group) => (
              <Card key={group.label} className="divide-y divide-border">
                <div className="px-6 py-3 bg-muted/30">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {group.label}
                  </p>
                </div>
                {group.fields.map((field) => {
                  const raw = localSettings[field.key];
                  const value =
                    field.type === 'toggle'
                      ? raw === true || raw === 'true'
                      : raw ?? '';

                  return (
                    <div key={field.key} className="px-6 py-5">
                      <div className="flex items-start justify-between gap-6">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-foreground mb-0.5">{field.label}</p>
                          <p className="text-xs text-muted-foreground">{field.description}</p>
                          <p className="text-[10px] text-muted-foreground/60 font-mono mt-0.5">{field.key}</p>
                        </div>
                        <div className="shrink-0 mt-1">
                          {field.type === 'toggle' ? (
                            <ToggleField
                              value={value as boolean}
                              onChange={(v) => handleChange(field.key, v)}
                            />
                          ) : field.type === 'number' ? (
                            <input
                              type="number"
                              value={value as number}
                              min={field.min}
                              max={field.max}
                              step={field.step}
                              onChange={(e) =>
                                handleChange(field.key, parseFloat(e.target.value))
                              }
                              className="w-32 bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground text-right focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                            />
                          ) : (
                            <input
                              type="text"
                              value={value as string}
                              onChange={(e) => handleChange(field.key, e.target.value)}
                              className="w-48 bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </Card>
            ))}

            {/* Chaves desconhecidas (não mapeadas nos grupos acima) */}
            {Object.keys(localSettings)
              .filter((k) => !SETTING_FIELDS.some((f) => f.key === k))
              .filter((k) => !k.startsWith('prompt.'))
              .map((key) => (
                <Card key={key} className="divide-y divide-border">
                  <div className="px-6 py-3 bg-muted/30">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      ⚙️ Outras Configurações
                    </p>
                  </div>
                  <div className="px-6 py-4">
                    <div className="flex items-center justify-between gap-6">
                      <div>
                        <p className="text-xs text-muted-foreground font-mono">{key}</p>
                      </div>
                      <input
                        type="text"
                        value={String(localSettings[key])}
                        onChange={(e) => handleChange(key, e.target.value)}
                        className="w-48 bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                      />
                    </div>
                  </div>
                </Card>
              ))}

            <Card className="p-6 space-y-3">
              <div className="flex items-start justify-between gap-6">
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground mb-0.5">💳 Quota mensal de IA</p>
                  <p className="text-xs text-muted-foreground">
                    Controla o limite mensal de tokens por organização e permite resetar o consumo.
                  </p>
                  {quota && (
                    <p className="text-[11px] text-muted-foreground/70 mt-1">
                      Período: {quota.period} • Usado: {quota.usedTokens.toLocaleString()} • Restante: {quota.remaining.toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="shrink-0 mt-1 flex items-center gap-2">
                  <input
                    type="number"
                    value={quotaMonthly}
                    min={0}
                    step={1000}
                    onChange={(e) => setQuotaMonthly(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-40 bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground text-right focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                    placeholder="Monthly quota"
                  />
                  <button
                    type="button"
                    disabled={quotaBusy || quotaMonthly === '' || typeof quotaMonthly !== 'number'}
                    onClick={async () => {
                      if (quotaMonthly === '' || typeof quotaMonthly !== 'number') return;
                      setQuotaBusy(true);
                      try {
                        const q = await quotaApi.update(quotaMonthly);
                        setQuota({ period: q.period, monthlyQuota: q.monthlyQuota, usedTokens: q.usedTokens, remaining: q.remaining });
                        setQuotaMonthly(q.monthlyQuota);
                      } finally {
                        setQuotaBusy(false);
                      }
                    }}
                    className="px-3 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    {quotaBusy ? '...' : 'Aplicar'}
                  </button>
                  <button
                    type="button"
                    disabled={quotaBusy}
                    onClick={async () => {
                      setQuotaBusy(true);
                      try {
                        const q = await quotaApi.reset();
                        setQuota({ period: q.period, monthlyQuota: q.monthlyQuota, usedTokens: q.usedTokens, remaining: q.remaining });
                        setQuotaMonthly(q.monthlyQuota);
                      } finally {
                        setQuotaBusy(false);
                      }
                    }}
                    className="px-3 py-2 rounded-lg text-sm font-medium border border-border bg-card hover:bg-muted disabled:opacity-50"
                  >
                    Resetar
                  </button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Reset button */}
        {hasChanges && !saving && (
          <div className="mt-3">
            <button
              onClick={() => setLocalSettings(settings)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Descartar alterações
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
