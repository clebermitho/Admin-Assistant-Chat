import { useEffect, useState, useCallback } from 'react';
import { Save, RefreshCw, ToggleLeft, ToggleRight } from 'lucide-react';
import { settingsApi } from '@/api/client';
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

const SETTING_FIELDS: SettingField[] = [
  {
    key: 'suggestion.model',
    label: 'Modelo OpenAI',
    description: 'Modelo usado para gerar sugestões de resposta.',
    type: 'text',
  },
  {
    key: 'suggestion.temperature',
    label: 'Temperatura',
    description: 'Controla a criatividade das respostas (0 = determinístico, 1 = criativo).',
    type: 'number',
    min: 0,
    max: 2,
    step: 0.1,
  },
  {
    key: 'suggestion.maxTokens',
    label: 'Máximo de Tokens',
    description: 'Número máximo de tokens gerados por resposta.',
    type: 'number',
    min: 100,
    max: 4000,
    step: 50,
  },
  {
    key: 'suggestion.learnFromApproved',
    label: 'Aprender com Aprovadas',
    description: 'Usar sugestões aprovadas para melhorar o modelo.',
    type: 'toggle',
  },
  {
    key: 'suggestion.filterRejected',
    label: 'Filtrar Reprovadas',
    description: 'Evitar sugestões similares a reprovadas anteriores.',
    type: 'toggle',
  },
];

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

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await settingsApi.list();
      setSettings(res.settings);
      setLocalSettings(res.settings);
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
      // Find changed keys
      const changedKeys = Object.keys(localSettings).filter(
        (k) => localSettings[k] !== settings[k]
      );
      await Promise.all(
        changedKeys.map((k) => settingsApi.update(k, localSettings[k]))
      );
      setSettings(localSettings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      // silently fail (user would see no feedback on specific error)
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = JSON.stringify(localSettings) !== JSON.stringify(settings);

  if (error) {
    return (
      <div>
        <PageHeader title="Configurações" description="Parâmetros do sistema Chatplay" />
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
          <Card className="divide-y divide-border">
            {SETTING_FIELDS.map((field) => {
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

            {/* Unknown settings */}
            {Object.keys(localSettings)
              .filter((k) => !SETTING_FIELDS.some((f) => f.key === k))
              .map((key) => (
                <div key={key} className="px-6 py-4">
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
              ))}
          </Card>
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
