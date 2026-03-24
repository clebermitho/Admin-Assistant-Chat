import { useCallback, useEffect, useState } from 'react';
import { Save, RefreshCw } from 'lucide-react';
import { settingsApi } from '@/api/client';
import { Card, ErrorState, PageHeader, Spinner } from '@/components/SharedUI';
import type { Settings } from '@/types';

const KEYS = {
  suggestions: 'prompt.suggestions',
  chat: 'prompt.chat',
} as const;

export default function PromptsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [suggestionsPrompt, setSuggestionsPrompt] = useState('');
  const [chatPrompt, setChatPrompt] = useState('');

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setSaved(false);
    try {
      const res = await settingsApi.list();
      const s = (res?.settings || {}) as Settings;
      setSuggestionsPrompt(typeof s[KEYS.suggestions] === 'string' ? String(s[KEYS.suggestions]) : '');
      setChatPrompt(typeof s[KEYS.chat] === 'string' ? String(s[KEYS.chat]) : '');
    } catch (e: any) {
      setError(e?.message || 'Erro ao carregar prompts.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await settingsApi.bulkUpdate({
        [KEYS.suggestions]: suggestionsPrompt,
        [KEYS.chat]: chatPrompt,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: any) {
      setError(e?.message || 'Erro ao salvar prompts.');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div>
        <PageHeader title="Prompts de IA" description="Edite os prompts usados no chat e nas sugestões." />
        <div className="flex items-center justify-center py-16">
          <Spinner />
        </div>
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={load} />;
  }

  return (
    <div>
      <PageHeader
        title="Prompts de IA"
        description="Esses prompts são aplicados no backend e entram em vigor assim que forem salvos."
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={load}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-card text-sm hover:bg-muted"
              disabled={saving}
              type="button"
            >
              <RefreshCw className="w-4 h-4" />
              Recarregar
            </button>
            <button
              onClick={onSave}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm hover:opacity-90 disabled:opacity-60"
              disabled={saving}
              type="button"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Salvando...' : saved ? 'Salvo' : 'Salvar'}
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4">
        <Card className="p-5 space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Sugestões (POST /api/ai/suggestions)</h2>
            <p className="text-xs text-muted-foreground">
              Variáveis: {'{{BASE_COREN}} {{BASE_SISTEMA}} {{CONTEXT}} {{QUESTION}} {{CATEGORY}} {{AVOID_BLOCK}} {{EXAMPLES_BLOCK}}'}
            </p>
          </div>
          <textarea
            value={suggestionsPrompt}
            onChange={(e) => setSuggestionsPrompt(e.target.value)}
            className="w-full min-h-[240px] rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
            placeholder="Deixe vazio para usar o prompt padrão do sistema."
          />
        </Card>

        <Card className="p-5 space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Chat (POST /api/ai/chat)</h2>
            <p className="text-xs text-muted-foreground">
              Variáveis: {'{{BASE_COREN}} {{BASE_SISTEMA}} {{CONTEXT}} {{MESSAGE}} {{HISTORY}}'}
            </p>
          </div>
          <textarea
            value={chatPrompt}
            onChange={(e) => setChatPrompt(e.target.value)}
            className="w-full min-h-[240px] rounded-md border border-border bg-background px-3 py-2 text-sm font-mono"
            placeholder="Deixe vazio para usar o prompt padrão do sistema."
          />
        </Card>
      </div>
    </div>
  );
}

