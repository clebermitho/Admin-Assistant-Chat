import { useEffect, useState, useCallback } from 'react';
import { Users, MessageSquare, CheckCircle, Activity, TrendingUp, Clock, BookOpen } from 'lucide-react';
import { metricsApi } from '@/api/client';
import type { MetricsSummaryResponse, ActivityData } from '@/types';
import {
  Card,
  SkeletonCard,
  ErrorState,
  PageHeader,
  SkeletonBox,
} from '@/components/SharedUI';

// ---- Metric Card ----
interface MetricCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  color: string;
}
function MetricCard({ label, value, sub, icon, color }: MetricCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground mb-1.5">{label}</p>
          <p className="text-2xl font-semibold text-foreground">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        </div>
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${color}20`, color }}
        >
          {icon}
        </div>
      </div>
    </Card>
  );
}

// ---- Activity Bar Chart (pure CSS) ----
interface BarChartProps {
  activity: ActivityData['activity'];
}
function ActivityBarChart({ activity }: BarChartProps) {
  const days = Object.keys(activity).sort();
  const totals = days.map((d) =>
    Object.values(activity[d]).reduce((a, b) => a + b, 0)
  );
  const max = Math.max(...totals, 1);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  return (
    <div className="flex items-end gap-2 h-40 w-full">
      {days.map((day, i) => {
        const pct = (totals[i] / max) * 100;
        return (
          <div key={day} className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
            <span className="text-[10px] text-muted-foreground font-mono">{totals[i]}</span>
            <div className="w-full rounded-t-sm bg-muted relative overflow-hidden" style={{ height: '96px' }}>
              <div
                className="absolute bottom-0 w-full rounded-t-sm transition-all duration-700"
                style={{
                  height: `${pct}%`,
                  background: 'oklch(0.65 0.20 220)',
                  opacity: 0.85,
                }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground truncate w-full text-center">
              {formatDate(day)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ---- Event type list ----
function EventTypeList({ byType }: { byType: Array<{ type: string; count: number }> }) {
  const total = byType.reduce((a, b) => a + b.count, 0);
  const sorted = [...byType].sort((a, b) => b.count - a.count).slice(0, 6);
  return (
    <div className="space-y-2.5">
      {sorted.map((ev) => {
        const pct = total > 0 ? (ev.count / total) * 100 : 0;
        return (
          <div key={ev.type}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-foreground font-mono">{ev.type}</span>
              <span className="text-xs text-muted-foreground">{ev.count}</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${pct}%`, background: 'oklch(0.65 0.20 220)' }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---- Main Dashboard ----
export default function DashboardPage() {
  const [summary, setSummary] = useState<MetricsSummaryResponse | null>(null);
  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const [s, a] = await Promise.all([
        metricsApi.summary(since),
        metricsApi.activity(7),
      ]);
      setSummary(s);
      setActivity(a);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar métricas.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (error) {
    return (
      <div>
        <PageHeader title="Dashboard" description="Visão geral do sistema" />
        <ErrorState message={error} onRetry={load} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Dashboard" description="Visão geral do sistema AssistentePlay" />

      {/* Metric Cards — 6 cards em grid 2x3 */}
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
        ) : summary ? (
          <>
            <MetricCard
              label="Usuários Ativos"
              value={summary.users.active}
              sub={`${summary.users.total} total`}
              icon={<Users className="w-4 h-4" />}
              color="#4f8ef7"
            />
            <MetricCard
              label="Total de Sugestões"
              value={summary.suggestions.total}
              sub={`${(summary.suggestions.approvalRate * 100).toFixed(1)}% aprovação`}
              icon={<MessageSquare className="w-4 h-4" />}
              color="#22c55e"
            />
            <MetricCard
              label="Feedback Aprovado"
              value={summary.feedback.approved}
              sub={`${summary.feedback.rejected} reprovados`}
              icon={<CheckCircle className="w-4 h-4" />}
              color="#22c55e"
            />
            <MetricCard
              label="Total de Eventos"
              value={summary.events.total}
              sub="últimos 30 dias"
              icon={<Activity className="w-4 h-4" />}
              color="#f59e0b"
            />
            <MetricCard
              label="Tempo Médio API"
              value={
                summary.suggestions.avgLatencyMs != null
                  ? `${(summary.suggestions.avgLatencyMs / 1000).toFixed(1)}s`
                  : '—'
              }
              sub="latência de sugestões"
              icon={<Clock className="w-4 h-4" />}
              color="#a78bfa"
            />
            <MetricCard
              label="Templates Aprendidos"
              value={summary.templates?.learned ?? summary.templates?.total ?? '—'}
              sub={
                summary.templates?.total != null
                  ? `${summary.templates.total} total`
                  : 'aprovadas pelo sistema'
              }
              icon={<BookOpen className="w-4 h-4" />}
              color="#34d399"
            />
          </>
        ) : null}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Activity Chart */}
        <Card className="xl:col-span-2 p-5">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Atividade (7 dias)</h2>
          </div>
          {isLoading ? (
            <div className="space-y-2">
              <SkeletonBox className="h-32 w-full" />
              <div className="flex gap-2">
                {Array.from({ length: 7 }).map((_, i) => (
                  <SkeletonBox key={i} className="h-3 flex-1" />
                ))}
              </div>
            </div>
          ) : activity && Object.keys(activity.activity).length > 0 ? (
            <ActivityBarChart activity={activity.activity} />
          ) : (
            <div className="h-40 flex items-center justify-center">
              <p className="text-sm text-muted-foreground">Sem dados de atividade</p>
            </div>
          )}
        </Card>

        {/* Events by type */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-5">
            <Activity className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Eventos por Tipo</h2>
          </div>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="space-y-1">
                  <SkeletonBox className="h-3 w-2/3" />
                  <SkeletonBox className="h-1.5 w-full" />
                </div>
              ))}
            </div>
          ) : summary && summary.events.byType.length > 0 ? (
            <EventTypeList byType={summary.events.byType} />
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum evento registrado
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
