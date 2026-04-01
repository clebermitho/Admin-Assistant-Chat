import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  Activity,
  Zap,
  PieChart,
  DollarSign,
  Users,
  UserCheck,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  BarChart3,
} from 'lucide-react';
import { analyticsApi } from '@/api/client';
import type {
  AnalyticsOverviewResponse,
  UserUsageRecord,
  UsageDataPoint,
} from '@/types';
import {
  Card,
  PageHeader,
  SkeletonBox,
  ErrorState,
  EmptyState,
} from '@/components/SharedUI';
import { cn } from '@/lib/utils';

// ---- Date range helpers ----
type DateRange = '7d' | '30d' | '90d';

function getSinceDate(range: DateRange): string {
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

const DATE_RANGE_LABELS: Record<DateRange, string> = {
  '7d': 'Últimos 7 dias',
  '30d': 'Últimos 30 dias',
  '90d': 'Últimos 90 dias',
};

// ---- Overview Card ----
interface OverviewCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: React.ReactNode;
}
function OverviewCard({ icon, label, value, sub }: OverviewCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex items-start gap-3">
      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-semibold text-foreground leading-tight">{value}</p>
        {sub && <div className="mt-1">{sub}</div>}
      </div>
    </div>
  );
}

// ---- Progress Bar ----
function ProgressBar({ percent }: { percent: number }) {
  const clamped = Math.min(100, Math.max(0, percent));
  const color =
    clamped >= 90 ? 'bg-destructive' : clamped >= 70 ? 'bg-yellow-500' : 'bg-primary';
  return (
    <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden mt-1.5">
      <div
        className={cn('h-full rounded-full transition-all', color)}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

// ---- CSS Bar Chart ----
interface BarChartProps {
  data: UsageDataPoint[];
}
function UsageBarChart({ data }: BarChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const maxRequests = Math.max(...(data.length > 0 ? data.map((d) => d.requests) : [0]), 1);
  const CHART_HEIGHT = 160; // px — matches h-40
  const MIN_BAR_PX = 5;

  // Y-axis: 4 ticks from 0 to maxRequests
  const yTicks = [0, 1, 2, 3].map((i) => Math.round((maxRequests / 3) * i));

  // Label interval: show a label every N bars depending on total count
  const labelInterval = data.length > 60 ? 14 : data.length > 30 ? 7 : data.length > 15 ? 5 : 1;

  // Period summary totals
  const totalRequests = data.reduce((s, d) => s + d.requests, 0);
  const totalTokens = data.reduce((s, d) => s + d.tokens, 0);
  const totalCost = data.reduce((s, d) => s + d.estimatedCostUsd, 0);

  if (data.length === 0) {
    return (
      <EmptyState
        icon={<BarChart3 className="w-6 h-6 text-muted-foreground" />}
        title="Nenhuma requisição de IA registrada"
        description="Nenhuma requisição de IA foi registrada neste período."
      />
    );
  }

  return (
    <div className="space-y-3">
      {/* Chart area */}
      <div className="flex gap-2">
        {/* Y-axis labels */}
        <div
          className="flex flex-col justify-between items-end shrink-0 pb-5"
          style={{ height: CHART_HEIGHT }}
        >
          {[...yTicks].reverse().map((tick) => (
            <span key={tick} className="text-[9px] text-muted-foreground/60 leading-none">
              {tick >= 1000 ? `${(tick / 1000).toFixed(1)}k` : tick}
            </span>
          ))}
        </div>

        {/* Bars + grid */}
        <div className="flex-1 min-w-0">
          <div className="relative" style={{ height: CHART_HEIGHT }}>
            {/* Horizontal grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-5">
              {[...yTicks].reverse().map((tick) => (
                <div key={tick} className="w-full border-t border-border/30" />
              ))}
            </div>

            {/* Bars row */}
            <div className="absolute inset-x-0 bottom-5 top-0 flex items-end gap-px">
              {data.map((point, i) => {
                const barHeightPct = (point.requests / maxRequests) * 100;
                const barHeightPx = Math.max(
                  (barHeightPct / 100) * (CHART_HEIGHT - 20),
                  point.requests > 0 ? MIN_BAR_PX : 2,
                );
                const label = new Date(point.date).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                });
                const isHovered = hoveredIndex === i;
                return (
                  <div
                    key={point.date}
                    className="relative flex-1 flex flex-col justify-end"
                    style={{ height: '100%' }}
                    onMouseEnter={() => setHoveredIndex(i)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  >
                    {/* Tooltip */}
                    {isHovered && (
                      <div
                        className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 z-10 bg-popover border border-border rounded-lg shadow-md px-2.5 py-2 text-xs whitespace-nowrap pointer-events-none"
                        style={{ minWidth: 140 }}
                      >
                        <p className="font-medium text-foreground mb-1">{label}</p>
                        <p className="text-muted-foreground">
                          Req:{' '}
                          <span className="text-foreground font-medium">
                            {point.requests.toLocaleString('pt-BR')}
                          </span>
                        </p>
                        <p className="text-muted-foreground">
                          Tokens:{' '}
                          <span className="text-foreground font-medium">
                            {point.tokens.toLocaleString('pt-BR')}
                          </span>
                        </p>
                        <p className="text-muted-foreground">
                          Custo:{' '}
                          <span className="text-foreground font-medium">
                            ${point.estimatedCostUsd.toFixed(4)}
                          </span>
                        </p>
                      </div>
                    )}
                    {/* Bar */}
                    <div
                      className={cn(
                        'w-full rounded-t-sm transition-colors',
                        point.requests === 0
                          ? 'bg-muted/50'
                          : isHovered
                            ? 'bg-primary'
                            : 'bg-primary/70',
                      )}
                      style={{ height: barHeightPx }}
                    />
                  </div>
                );
              })}
            </div>

            {/* X-axis date labels */}
            <div className="absolute inset-x-0 bottom-0 h-5 flex items-end gap-px">
              {data.map((point, i) => {
                const label = new Date(point.date).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                });
                const showLabel = i % labelInterval === 0;
                return (
                  <div key={point.date} className="flex-1 flex justify-center overflow-hidden">
                    {showLabel && (
                      <span className="text-[8px] text-muted-foreground/60 leading-none truncate">
                        {label}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Period summary */}
      <div className="flex items-center gap-4 pt-1 border-t border-border/40 text-xs text-muted-foreground flex-wrap">
        <span>
          Total:{' '}
          <span className="font-medium text-foreground">
            {totalRequests.toLocaleString('pt-BR')} req
          </span>
        </span>
        <span>
          Tokens:{' '}
          <span className="font-medium text-foreground">
            {totalTokens.toLocaleString('pt-BR')}
          </span>
        </span>
        <span>
          Custo estimado:{' '}
          <span className="font-medium text-foreground">${totalCost.toFixed(4)}</span>
        </span>
      </div>
    </div>
  );
}

// ---- Sortable table ----
type SortField = 'name' | 'requests' | 'tokens' | 'estimatedCostUsd';
type SortDir = 'asc' | 'desc';

interface SortableHeaderProps {
  field: SortField;
  label: string;
  current: SortField;
  direction: SortDir;
  onSort: (f: SortField) => void;
}
function SortableHeader({ field, label, current, direction, onSort }: SortableHeaderProps) {
  return (
    <th
      className="text-left px-4 py-3 text-xs font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors"
      onClick={() => onSort(field)}
    >
      <span className="flex items-center gap-1">
        {label}
        {current === field ? (
          direction === 'asc' ? (
            <ChevronUp className="w-3 h-3" />
          ) : (
            <ChevronDown className="w-3 h-3" />
          )
        ) : (
          <ChevronsUpDown className="w-3 h-3 opacity-40" />
        )}
      </span>
    </th>
  );
}

// ---- Main ----
export default function AnalyticsPage() {
  const [overview, setOverview] = useState<AnalyticsOverviewResponse | null>(null);
  const [usagePerUser, setUsagePerUser] = useState<UserUsageRecord[]>([]);
  const [usageOverTime, setUsageOverTime] = useState<UsageDataPoint[]>([]);

  const [dateRange, setDateRange] = useState<DateRange>('30d');

  const [loadingOverview, setLoadingOverview] = useState(true);
  const [loadingPerUser, setLoadingPerUser] = useState(true);
  const [loadingOverTime, setLoadingOverTime] = useState(true);
  const [errorOverview, setErrorOverview] = useState<string | null>(null);
  const [errorPerUser, setErrorPerUser] = useState<string | null>(null);
  const [errorOverTime, setErrorOverTime] = useState<string | null>(null);

  const [sortField, setSortField] = useState<SortField>('requests');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Memoize `since` so it only changes when dateRange changes, preventing
  // infinite re-renders caused by getSinceDate() returning a new string each call.
  const since = useMemo(() => getSinceDate(dateRange), [dateRange]);

  // Incrementing this token manually triggers a retry of the date-ranged data.
  const [fetchRevision, setFetchRevision] = useState(0);

  // Ref used to abort in-flight overview requests on cleanup.
  const overviewControllerRef = useRef<AbortController | null>(null);

  const loadOverview = useCallback(async () => {
    overviewControllerRef.current?.abort();
    const controller = new AbortController();
    overviewControllerRef.current = controller;

    setLoadingOverview(true);
    setErrorOverview(null);
    try {
      const res = await analyticsApi.overview({ signal: controller.signal });
      if (!controller.signal.aborted) setOverview(res);
    } catch (e) {
      if (!controller.signal.aborted) {
        setErrorOverview(e instanceof Error ? e.message : 'Erro ao carregar visão geral.');
      }
    } finally {
      if (!controller.signal.aborted) setLoadingOverview(false);
    }
  }, []);

  useEffect(() => {
    loadOverview();
    return () => { overviewControllerRef.current?.abort(); };
  }, [loadOverview]);

  // Fetch usage-per-user and usage-over-time together. Depends only on `since`
  // (memoized from dateRange) and `fetchRevision` (incremented on manual retry).
  // AbortController cancels in-flight requests when the effect re-runs or the
  // component unmounts, preventing the request accumulation loop.
  useEffect(() => {
    const controller = new AbortController();

    const fetchData = async () => {
      setLoadingPerUser(true);
      setErrorPerUser(null);
      try {
        const res = await analyticsApi.usagePerUser(since, { signal: controller.signal });
        if (!controller.signal.aborted) setUsagePerUser(res.users ?? []);
      } catch (e) {
        if (!controller.signal.aborted) {
          setErrorPerUser(e instanceof Error ? e.message : 'Erro ao carregar uso por usuário.');
        }
      } finally {
        if (!controller.signal.aborted) setLoadingPerUser(false);
      }

      setLoadingOverTime(true);
      setErrorOverTime(null);
      try {
        const res = await analyticsApi.usageOverTime(since, 'day', { signal: controller.signal });
        if (!controller.signal.aborted) setUsageOverTime(res.data ?? []);
      } catch (e) {
        if (!controller.signal.aborted) {
          setErrorOverTime(e instanceof Error ? e.message : 'Erro ao carregar uso ao longo do tempo.');
        }
      } finally {
        if (!controller.signal.aborted) setLoadingOverTime(false);
      }
    };

    fetchData();

    return () => controller.abort();
  }, [since, fetchRevision]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const sortedUsers = useMemo(() => {
    return [...usagePerUser].sort((a, b) => {
      const av = a[sortField];
      const bv = b[sortField];
      if (typeof av === 'string' && typeof bv === 'string') {
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortDir === 'asc'
        ? (av as number) - (bv as number)
        : (bv as number) - (av as number);
    });
  }, [usagePerUser, sortField, sortDir]);

  const retryAll = () => {
    loadOverview();
    setFetchRevision((r) => r + 1);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="API Analytics"
        description="Monitoramento de uso da API, tokens e custos por período"
      />

      {/* Overview Cards */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Visão Geral
        </p>
        {errorOverview ? (
          <ErrorState message={errorOverview} onRetry={loadOverview} />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
            {loadingOverview ? (
              Array.from({ length: 6 }).map((_, i) => (
                <SkeletonBox key={i} className="h-24 rounded-xl" />
              ))
            ) : overview ? (
              <>
                <OverviewCard
                  icon={<Activity className="w-4 h-4 text-primary" />}
                  label="Total de Chamadas"
                  value={overview.totalCalls.toLocaleString('pt-BR')}
                />
                <OverviewCard
                  icon={<Zap className="w-4 h-4 text-primary" />}
                  label="Tokens Usados"
                  value={overview.tokensUsed.toLocaleString('pt-BR')}
                  sub={
                    overview.monthlyQuota > 0 && (
                      <>
                        <p className="text-[11px] text-muted-foreground/70">
                          de {overview.monthlyQuota.toLocaleString('pt-BR')} cota mensal
                        </p>
                        <ProgressBar percent={overview.quotaPercent} />
                      </>
                    )
                  }
                />
                <OverviewCard
                  icon={<PieChart className="w-4 h-4 text-primary" />}
                  label="Uso da Cota"
                  value={`${overview.quotaPercent.toFixed(1)}%`}
                  sub={<ProgressBar percent={overview.quotaPercent} />}
                />
                <OverviewCard
                  icon={<DollarSign className="w-4 h-4 text-primary" />}
                  label="Custo Estimado"
                  value={`$${overview.estimatedCostUsd.toFixed(4)}`}
                />
                <OverviewCard
                  icon={<Users className="w-4 h-4 text-primary" />}
                  label="Total de Usuários"
                  value={overview.totalUsers.toLocaleString('pt-BR')}
                />
                <OverviewCard
                  icon={<UserCheck className="w-4 h-4 text-primary" />}
                  label="Usuários Ativos"
                  value={overview.activeUsers.toLocaleString('pt-BR')}
                />
              </>
            ) : null}
          </div>
        )}
      </div>

      {/* Usage Over Time Chart */}
      <Card>
        <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Uso ao Longo do Tempo</p>
            <p className="text-xs text-muted-foreground mt-0.5">Requisições diárias por período</p>
          </div>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as DateRange)}
            className="bg-background border border-border rounded-lg px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
          >
            {(Object.entries(DATE_RANGE_LABELS) as [DateRange, string][]).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div className="p-5">
          {errorOverTime ? (
            <ErrorState message={errorOverTime} onRetry={() => setFetchRevision((r) => r + 1)} />
          ) : loadingOverTime ? (
            <SkeletonBox className="h-40 w-full rounded-lg" />
          ) : (
            <UsageBarChart data={usageOverTime} />
          )}
        </div>
      </Card>

      {/* Usage Per User Table */}
      <Card>
        <div className="px-5 py-4 border-b border-border">
          <p className="text-sm font-semibold text-foreground">Uso por Usuário</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {DATE_RANGE_LABELS[dateRange]} — clique no cabeçalho para ordenar
          </p>
        </div>
        {errorPerUser ? (
          <div className="p-5">
            <ErrorState message={errorPerUser} onRetry={() => setFetchRevision((r) => r + 1)} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <SortableHeader
                    field="name"
                    label="Usuário"
                    current={sortField}
                    direction={sortDir}
                    onSort={handleSort}
                  />
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">
                    E-mail
                  </th>
                  <SortableHeader
                    field="requests"
                    label="Requisições"
                    current={sortField}
                    direction={sortDir}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    field="tokens"
                    label="Tokens"
                    current={sortField}
                    direction={sortDir}
                    onSort={handleSort}
                  />
                  <SortableHeader
                    field="estimatedCostUsd"
                    label="Custo Estimado"
                    current={sortField}
                    direction={sortDir}
                    onSort={handleSort}
                  />
                </tr>
              </thead>
              <tbody>
                {loadingPerUser ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td colSpan={5} className="px-4 py-3">
                        <SkeletonBox className="h-4 w-full rounded" />
                      </td>
                    </tr>
                  ))
                ) : sortedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      Sem dados de uso para o período selecionado.
                    </td>
                  </tr>
                ) : (
                  sortedUsers.map((u) => (
                    <tr
                      key={u.userId}
                      className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-4 py-3 align-middle">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                            <span className="text-[11px] font-semibold text-primary">
                              {u.name[0]?.toUpperCase() || '?'}
                            </span>
                          </div>
                          <span className="font-medium text-foreground">{u.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-middle text-muted-foreground">{u.email}</td>
                      <td className="px-4 py-3 align-middle tabular-nums">
                        {u.requests.toLocaleString('pt-BR')}
                      </td>
                      <td className="px-4 py-3 align-middle tabular-nums text-muted-foreground">
                        {u.tokens.toLocaleString('pt-BR')}
                      </td>
                      <td className="px-4 py-3 align-middle tabular-nums text-muted-foreground">
                        ${u.estimatedCostUsd.toFixed(4)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Retry all on total failure */}
      {errorOverview && errorPerUser && errorOverTime && (
        <div className="flex justify-center">
          <button
            onClick={retryAll}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      )}
    </div>
  );
}
