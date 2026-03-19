import { useEffect, useState, useCallback } from 'react';
import { Activity, RefreshCw, AlertCircle, Zap, Lock } from 'lucide-react';
import { eventsApi, type RecentEventsResponse } from '@/api/client';
import {
  Card, PageHeader, SkeletonRow, ErrorState, EmptyState,
} from '@/components/SharedUI';

// ---- Filtro ----
type FilterType = 'all' | 'errors' | 'ai' | 'auth';
const FILTERS: { key: FilterType; label: string; icon: React.ReactNode }[] = [
  { key: 'all',    label: 'Todos',         icon: <Activity className="w-3.5 h-3.5" /> },
  { key: 'errors', label: 'Erros',         icon: <AlertCircle className="w-3.5 h-3.5" /> },
  { key: 'ai',     label: 'IA',            icon: <Zap className="w-3.5 h-3.5" /> },
  { key: 'auth',   label: 'Autenticação',  icon: <Lock className="w-3.5 h-3.5" /> },
];

// ---- Badge de tipo ----
function EventTypeBadge({ type }: { type: string }) {
  const color =
    type.startsWith('error.')  ? 'bg-destructive/15 text-destructive' :
    type.startsWith('ai.')     ? 'bg-primary/15 text-primary' :
    type.startsWith('auth.')   ? 'bg-yellow-500/15 text-yellow-400' :
    type.startsWith('user.')   ? 'bg-emerald-500/15 text-emerald-400' :
    'bg-muted text-muted-foreground';

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium ${color}`}>
      {type}
    </span>
  );
}

// ---- Linha de evento ----
function EventRow({ event }: { event: RecentEventsResponse['events'][0] }) {
  const time = new Date(event.createdAt).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  });

  const payloadStr = Object.keys(event.payload).length > 0
    ? JSON.stringify(event.payload, null, 0).slice(0, 120)
    : null;

  return (
    <div className="flex items-start gap-3 px-4 py-3 border-b border-border/40 last:border-0 hover:bg-white/[0.02] transition-colors">
      <span className="text-[11px] text-muted-foreground font-mono shrink-0 mt-0.5 w-[120px]">{time}</span>
      <div className="flex-1 min-w-0 space-y-0.5">
        <EventTypeBadge type={event.eventType} />
        {payloadStr && (
          <p className="text-[11px] text-muted-foreground font-mono truncate">{payloadStr}</p>
        )}
      </div>
      {event.user && (
        <span className="text-[11px] text-muted-foreground shrink-0">{event.user.name}</span>
      )}
    </div>
  );
}

// ---- Summary 24h ----
function Summary24h({ data }: { data: RecentEventsResponse['summary24h'] }) {
  if (!data.length) return null;
  const total = data.reduce((a, b) => a + b.count, 0);

  return (
    <Card className="p-4 mb-4">
      <p className="text-xs font-medium text-muted-foreground mb-3">Últimas 24h — {total} eventos</p>
      <div className="flex flex-wrap gap-2">
        {data.slice(0, 8).map(item => (
          <div key={item.type} className="flex items-center gap-1.5 text-xs">
            <span className="font-mono text-muted-foreground">{item.type}</span>
            <span className="font-semibold text-foreground">{item.count}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ============================================================
// Page
// ============================================================
export default function EventsPage() {
  const [filter, setFilter]   = useState<FilterType>('all');
  const [data,   setData]     = useState<RecentEventsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await eventsApi.recent(filter === 'all' ? undefined : filter, 50);
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar eventos.');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Eventos Recentes"
        description="Auditoria de atividade — autenticações, IA e erros"
        action={
          <button
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-md border border-border hover:bg-white/5 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        }
      />

      {/* Filtros */}
      <div className="flex gap-2">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all
              ${filter === f.key
                ? 'bg-primary/15 text-primary border border-primary/30'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/5 border border-transparent'
              }`}
          >
            {f.icon}
            {f.label}
          </button>
        ))}
      </div>

      {/* Summary 24h */}
      {data?.summary24h && <Summary24h data={data.summary24h} />}

      {/* Lista */}
      <Card className="p-0 overflow-hidden">
        {error ? (
          <ErrorState message={error} onRetry={load} />
        ) : loading ? (
          <div className="divide-y divide-border/40">
            {Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)}
          </div>
        ) : !data?.events.length ? (
          <EmptyState title="Nenhum evento encontrado" description="Ajuste o filtro ou aguarde atividade do sistema." />
        ) : (
          <div>
            {data.events.map(e => <EventRow key={e.id} event={e} />)}
          </div>
        )}
      </Card>
    </div>
  );
}
