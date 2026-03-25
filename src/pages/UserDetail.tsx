import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Shield,
  User as UserIcon,
  KeyRound,
  Save,
  RefreshCw,
  MessageSquare,
  Lightbulb,
  ThumbsUp,
  Clock,
  BarChart2,
} from 'lucide-react';
import { usersApi } from '@/api/client';
import type { User } from '@/types';
import {
  Card,
  PageHeader,
  SkeletonBox,
  ErrorState,
  StatusBadge,
  Spinner,
} from '@/components/SharedUI';
import { cn } from '@/lib/utils';

// ---- Format date ----
function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ---- Helpers ----
function formatLimit(limit: number | null | undefined, defaultText = 'Limite: padrão global') {
  if (limit == null) return defaultText;
  return `Limite: ${limit === 0 ? '∞' : limit}`;
}

// ---- Stat Card ----
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub?: string;
}
function StatCard({ icon, label, value, sub }: StatCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex items-start gap-3">
      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-semibold text-foreground leading-tight">{value}</p>
        {sub && <p className="text-[11px] text-muted-foreground/70 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ---- Reset Password Modal ----
interface ResetPasswordModalProps {
  userId: string;
  onClose: () => void;
}
function ResetPasswordModal({ userId, onClose }: ResetPasswordModalProps) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await usersApi.resetPassword(userId, password);
      setSuccess(true);
      setTimeout(onClose, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao redefinir senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Resetar Senha</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors text-lg leading-none"
          >
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {success ? (
            <p className="text-sm text-[#22c55e] text-center py-2">✓ Senha redefinida com sucesso!</p>
          ) : (
            <>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Nova senha
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                />
              </div>
              {error && (
                <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
                >
                  {loading ? <Spinner size="sm" /> : null}
                  Redefinir
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}

// ---- Main ----
interface UserStats {
  chatToday?: number;
  suggestionsToday?: number;
  totalChat?: number;
  totalSuggestions?: number;
  totalFeedbacks?: number;
  lastActivity?: string | null;
}

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<UserStats>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [chatLimit, setChatLimit] = useState<string>('');
  const [suggestionLimit, setSuggestionLimit] = useState<string>('');
  const [savingLimits, setSavingLimits] = useState(false);
  const [savedLimits, setSavedLimits] = useState(false);
  const [limitsError, setLimitsError] = useState<string | null>(null);

  const [showResetModal, setShowResetModal] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await usersApi.get(id);
      const u = res.user;
      setUser(u);
      // Parse stats from the response (backend may return them in the user object or a nested key)
      const raw = res.user.stats as Record<string, unknown> | undefined;
      setStats({
        chatToday: (raw?.chatToday ?? raw?.chatMessagesToday) as number | undefined,
        suggestionsToday: (raw?.suggestionsToday) as number | undefined,
        totalChat: (raw?.totalChat ?? raw?.totalChatMessages) as number | undefined,
        totalSuggestions: (raw?.totalSuggestions) as number | undefined,
        totalFeedbacks: (raw?.totalFeedbacks ?? raw?.feedbackGiven) as number | undefined,
        lastActivity: (raw?.lastActivity ?? u.lastSeenAt) as string | null | undefined,
      });
      setChatLimit(u.dailyChatLimit != null ? String(u.dailyChatLimit) : '');
      setSuggestionLimit(u.dailySuggestionLimit != null ? String(u.dailySuggestionLimit) : '');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar usuário.');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleSaveLimits = async () => {
    if (!id || !user) return;
    setSavingLimits(true);
    setSavedLimits(false);
    setLimitsError(null);
    try {
      const dailyChatLimit = chatLimit === '' ? null : Number(chatLimit);
      const dailySuggestionLimit = suggestionLimit === '' ? null : Number(suggestionLimit);
      if (dailyChatLimit != null && dailyChatLimit < 0) {
        setLimitsError('O limite de chat não pode ser negativo.');
        return;
      }
      if (dailySuggestionLimit != null && dailySuggestionLimit < 0) {
        setLimitsError('O limite de sugestões não pode ser negativo.');
        return;
      }
      const res = await usersApi.update(id, { dailyChatLimit, dailySuggestionLimit });
      setUser(res.user);
      setSavedLimits(true);
      setTimeout(() => setSavedLimits(false), 2500);
    } catch (e) {
      setLimitsError(e instanceof Error ? e.message : 'Erro ao salvar limites.');
    } finally {
      setSavingLimits(false);
    }
  };

  if (error) {
    return (
      <div>
        <PageHeader
          title="Detalhes do Usuário"
          action={
            <button
              onClick={() => navigate('/users')}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </button>
          }
        />
        <ErrorState message={error} onRetry={load} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Detalhes do Usuário"
        action={
          <button
            onClick={() => navigate('/users')}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
        }
      />

      {isLoading ? (
        <div className="space-y-6 max-w-2xl">
          <Card className="p-6 space-y-4">
            <SkeletonBox className="h-5 w-1/3" />
            <SkeletonBox className="h-4 w-1/2" />
            <SkeletonBox className="h-4 w-1/4" />
          </Card>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonBox key={i} className="h-24 rounded-xl" />
            ))}
          </div>
        </div>
      ) : user ? (
        <div className="space-y-6 max-w-2xl">
          {/* User Header Card */}
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                  <span className="text-xl font-semibold text-primary">
                    {user.name[0]?.toUpperCase()}
                  </span>
                </div>
                <span
                  className={cn(
                    'absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card',
                    user.isOnline ? 'bg-[#22c55e] animate-pulse' : 'bg-muted-foreground/40'
                  )}
                  title={user.isOnline ? 'Online' : 'Offline'}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-semibold text-foreground">{user.name}</h2>
                  <StatusBadge variant={user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' ? 'primary' : 'muted'}>
                    {user.role === 'ADMIN' || user.role === 'SUPER_ADMIN' ? (
                      <span className="flex items-center gap-1">
                        <Shield className="w-2.5 h-2.5" />
                        {user.role}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <UserIcon className="w-2.5 h-2.5" />
                        {user.role}
                      </span>
                    )}
                  </StatusBadge>
                  <StatusBadge variant={user.isOnline ? 'success' : 'muted'}>
                    {user.isOnline ? 'Online' : 'Offline'}
                  </StatusBadge>
                  {user.isActive === false && (
                    <StatusBadge variant="danger">Inativo</StatusBadge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5 truncate">{user.email}</p>
                <p className="text-xs text-muted-foreground/60 mt-0.5">
                  Último acesso: {fmtDate(user.lastSeenAt)}
                </p>
              </div>
              <button
                onClick={() => setShowResetModal(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors shrink-0"
              >
                <KeyRound className="w-3.5 h-3.5" />
                Resetar senha
              </button>
            </div>
          </Card>

          {/* Stats */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Estatísticas
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <StatCard
                icon={<MessageSquare className="w-4 h-4 text-primary" />}
                label="Chat hoje"
                value={stats.chatToday ?? '—'}
                sub={formatLimit(user.dailyChatLimit)}
              />
              <StatCard
                icon={<Lightbulb className="w-4 h-4 text-primary" />}
                label="Sugestões hoje"
                value={stats.suggestionsToday ?? '—'}
                sub={formatLimit(user.dailySuggestionLimit)}
              />
              <StatCard
                icon={<BarChart2 className="w-4 h-4 text-primary" />}
                label="Total de chats"
                value={stats.totalChat ?? '—'}
              />
              <StatCard
                icon={<BarChart2 className="w-4 h-4 text-primary" />}
                label="Total de sugestões"
                value={stats.totalSuggestions ?? '—'}
              />
              <StatCard
                icon={<ThumbsUp className="w-4 h-4 text-primary" />}
                label="Feedbacks dados"
                value={stats.totalFeedbacks ?? '—'}
              />
              <StatCard
                icon={<Clock className="w-4 h-4 text-primary" />}
                label="Última atividade"
                value={
                  <span className="text-sm font-medium">
                    {stats.lastActivity ? fmtDate(stats.lastActivity) : '—'}
                  </span>
                }
              />
            </div>
          </div>

          {/* Individual Limits */}
          <Card className="divide-y divide-border">
            <div className="px-6 py-3 bg-muted/30">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                ⚙️ Limites Individuais
              </p>
            </div>
            <div className="px-6 py-5 space-y-5">
              <p className="text-xs text-muted-foreground">
                Deixe em branco para usar o limite global padrão. Use <strong>0</strong> para ilimitado.
              </p>

              <div className="flex items-start justify-between gap-6">
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground mb-0.5">Limite de chat por dia</p>
                  <p className="text-xs text-muted-foreground">
                    Máximo de mensagens no chat IA por dia para este usuário.
                  </p>
                </div>
                <input
                  type="number"
                  value={chatLimit}
                  min={0}
                  step={1}
                  placeholder="Global"
                  onChange={(e) => setChatLimit(e.target.value)}
                  className="w-28 bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground text-right focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                />
              </div>

              <div className="flex items-start justify-between gap-6">
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground mb-0.5">Limite de sugestões por dia</p>
                  <p className="text-xs text-muted-foreground">
                    Máximo de sugestões solicitadas por dia para este usuário.
                  </p>
                </div>
                <input
                  type="number"
                  value={suggestionLimit}
                  min={0}
                  step={1}
                  placeholder="Global"
                  onChange={(e) => setSuggestionLimit(e.target.value)}
                  className="w-28 bg-background border border-border rounded-lg px-3 py-2 text-sm text-foreground text-right focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                />
              </div>

              {limitsError && (
                <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                  {limitsError}
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                {savedLimits && (
                  <span className="text-xs text-[#22c55e]">✓ Limites salvos com sucesso</span>
                )}
                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setChatLimit(user.dailyChatLimit != null ? String(user.dailyChatLimit) : '');
                      setSuggestionLimit(user.dailySuggestionLimit != null ? String(user.dailySuggestionLimit) : '');
                      setLimitsError(null);
                    }}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Descartar
                  </button>
                  <button
                    onClick={handleSaveLimits}
                    disabled={savingLimits}
                    className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {savingLimits ? <Spinner size="sm" /> : <Save className="w-4 h-4" />}
                    Salvar limites
                  </button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      ) : null}

      {showResetModal && user && (
        <ResetPasswordModal
          userId={user.id}
          onClose={() => setShowResetModal(false)}
        />
      )}
    </div>
  );
}
