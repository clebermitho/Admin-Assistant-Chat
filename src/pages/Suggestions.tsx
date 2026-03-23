import { useEffect, useState, useCallback } from 'react';
import { MessageSquare, ThumbsDown, Star, TrendingUp } from 'lucide-react';
import { suggestionsApi } from '@/api/client';
import type { Suggestion, RejectedFeedback } from '@/types';
import {
  Card,
  PageHeader,
  SkeletonRow,
  SkeletonBox,
  ErrorState,
  EmptyState,
  StatusBadge,
} from '@/components/SharedUI';
import { SUGGESTION_CATEGORIES } from '@/lib/constants';

// ---- Score Bar ----
function ScoreBar({ score }: { score: number }) {
  const pct = Math.min(Math.max(score * 100, 0), 100);
  const color = score > 0.7 ? '#22c55e' : score > 0.4 ? '#f59e0b' : '#ef4444';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs text-muted-foreground font-mono w-8 text-right">
        {(score * 100).toFixed(0)}%
      </span>
    </div>
  );
}

// ---- Suggestions Tab ----
function SuggestionsTab() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<string>('');

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await suggestionsApi.list(category || undefined, 50);
      setSuggestions(res.suggestions);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar sugestões.');
    } finally {
      setIsLoading(false);
    }
  }, [category]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      {/* Filter */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setCategory('')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
            category === ''
              ? 'bg-primary/15 border-primary/30 text-primary'
              : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          Todas
        </button>
        {SUGGESTION_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              category === cat
                ? 'bg-primary/15 border-primary/30 text-primary'
                : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Texto</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground w-40">Score</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground w-24">Usos</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td colSpan={3}><SkeletonRow /></td>
                    </tr>
                  ))
                ) : suggestions.length === 0 ? (
                  <tr>
                    <td colSpan={3}>
                      <EmptyState
                        title="Nenhuma sugestão encontrada"
                        description="Sem sugestões para a categoria selecionada."
                        icon={<MessageSquare className="w-6 h-6 text-muted-foreground" />}
                      />
                    </td>
                  </tr>
                ) : (
                  suggestions.map((s) => (
                    <tr key={s.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-foreground text-sm leading-relaxed line-clamp-2">{s.text}</p>
                      </td>
                      <td className="px-4 py-3">
                        <ScoreBar score={s.score} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        <div className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          {s.usageCount}×
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

// ---- Rejected Tab ----
function RejectedTab() {
  const [rejected, setRejected] = useState<RejectedFeedback[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await suggestionsApi.rejectedFeedback();
      setRejected(res.rejected);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar reprovadas.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

  return (
    <div>
      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Sugestão</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground w-32">Categoria</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Motivo</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground w-28">Data</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td colSpan={4}>
                        <div className="flex gap-4 px-4 py-3">
                          <SkeletonBox className="h-4 flex-1" />
                          <SkeletonBox className="h-4 w-24" />
                          <SkeletonBox className="h-4 flex-1" />
                          <SkeletonBox className="h-4 w-20" />
                        </div>
                      </td>
                    </tr>
                  ))
                ) : rejected.length === 0 ? (
                  <tr>
                    <td colSpan={4}>
                      <EmptyState
                        title="Nenhuma sugestão reprovada"
                        description="Ótimo! Não há sugestões reprovadas no momento."
                        icon={<ThumbsDown className="w-6 h-6 text-muted-foreground" />}
                      />
                    </td>
                  </tr>
                ) : (
                  rejected.map((r) => (
                    <tr key={r.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-foreground text-sm line-clamp-2">{r.suggestion.text}</p>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge variant="warning">{r.suggestion.category}</StatusBadge>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-muted-foreground text-xs">{r.reason}</p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{fmtDate(r.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

// ---- Main ----
export default function SuggestionsPage() {
  const [tab, setTab] = useState<'suggestions' | 'rejected'>('suggestions');

  return (
    <div>
      <PageHeader
        title="Sugestões"
        description="Visualize sugestões por categoria e feedback reprovado"
      />

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-5 p-1 bg-card border border-border rounded-xl w-fit">
        <button
          onClick={() => setTab('suggestions')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'suggestions'
              ? 'bg-primary/15 text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Star className="w-3.5 h-3.5" />
          Sugestões
        </button>
        <button
          onClick={() => setTab('rejected')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === 'rejected'
              ? 'bg-destructive/15 text-destructive'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <ThumbsDown className="w-3.5 h-3.5" />
          Reprovadas
        </button>
      </div>

      {tab === 'suggestions' ? <SuggestionsTab /> : <RejectedTab />}
    </div>
  );
}
