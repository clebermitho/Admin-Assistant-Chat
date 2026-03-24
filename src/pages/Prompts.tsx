import { useCallback, useEffect, useState } from 'react';
import { Save, RefreshCw } from 'lucide-react';
import { settingsApi } from '@/api/client';
import { Card, ErrorState, PageHeader, Spinner } from '@/components/SharedUI';
import type { Settings } from '@/types';

const KEYS = {
  suggestions: 'prompt.suggestions',
  chat: 'prompt.chat',
} as const;

const DEFAULT_SUGGESTIONS_PROMPT = `Você é um assistente especializado do Coren (Conselho Regional de Enfermagem).

BASE COREN:
{{BASE_COREN}}

BASE SISTEMA:
{{BASE_SISTEMA}}

REGRAS:
1. Nunca chame o profissional de "cliente" — use "profissional".
2. Não invente leis, resoluções ou procedimentos.
3. Respostas curtas, claras, objetivas e com tom institucional.
4. Em débitos, sempre conduza para regularização.
5. Nunca confirme valores de parcelas — informe que verificará no sistema.
{{AVOID_BLOCK}}
{{EXAMPLES_BLOCK}}

CONTEXTO DA CONVERSA:
{{CONTEXT}}

PERGUNTA PRINCIPAL:
{{QUESTION}}

Gere exatamente 3 respostas profissionais e objetivas para esta situação.
Separe cada resposta por uma linha em branco.
NÃO use numeração nem prefixos como "Resposta 1:".`;

const DEFAULT_CHAT_PROMPT = `Você é um assistente inteligente do Coren que ajuda operadores humanos.

BASE COREN:
{{BASE_COREN}}

BASE SISTEMA:
{{BASE_SISTEMA}}

CONTEXTO (se houver):
{{CONTEXT}}

HISTÓRICO (se houver):
{{HISTORY}}

MENSAGEM DO OPERADOR:
{{MESSAGE}}

IMPORTANTE: Responda de forma natural, clara e útil. Use emojis quando apropriado.`;

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
      const sp = typeof s[KEYS.suggestions] === 'string' ? String(s[KEYS.suggestions]) : '';
      const cp = typeof s[KEYS.chat] === 'string' ? String(s[KEYS.chat]) : '';
      setSuggestionsPrompt(sp.trim().length > 0 ? sp : DEFAULT_SUGGESTIONS_PROMPT);
      setChatPrompt(cp.trim().length > 0 ? cp : DEFAULT_CHAT_PROMPT);
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
            placeholder="Prompt de sugestões..."
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
            placeholder="Prompt do chat..."
          />
        </Card>
      </div>
    </div>
  );
}
