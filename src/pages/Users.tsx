import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserPlus,
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  Clock,
  Shield,
  User as UserIcon,
} from 'lucide-react';
import { usersApi } from '@/api/client';
import type { User } from '@/types';
import {
  Card,
  PageHeader,
  SkeletonRow,
  ErrorState,
  EmptyState,
  StatusBadge,
  Spinner,
} from '@/components/SharedUI';
import { cn } from '@/lib/utils';

// ---- Format date ----
function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ---- Create User Modal ----
interface CreateModalProps {
  onClose: () => void;
  onCreated: () => void;
}
function CreateUserModal({ onClose, onCreated }: CreateModalProps) {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'AGENT' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.name || !form.email || !form.password) {
      setError('Preencha todos os campos.');
      return;
    }
    setLoading(true);
    try {
      await usersApi.create(form);
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar usuário.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Novo Agente</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors text-lg leading-none"
          >
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Nome</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="João da Silva"
              className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">E-mail</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="joao@coren.org.br"
              className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Senha</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
              className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Role</label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
            >
              <option value="AGENT">AGENT</option>
              <option value="ADMIN">ADMIN</option>
            </select>
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
              Criar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---- Toggle button ----
interface ToggleActiveProps {
  user: User;
  onToggle: (id: string, isActive: boolean) => void;
  loading: boolean;
}
function ToggleActive({ user, onToggle, loading }: ToggleActiveProps) {
  return (
    <button
      onClick={() => onToggle(user.id, !user.isActive)}
      disabled={loading}
      title={user.isActive ? 'Desativar' : 'Ativar'}
      className={cn(
        'relative w-9 h-5 rounded-full transition-colors',
        user.isActive ? 'bg-[#22c55e]/80' : 'bg-muted',
        loading && 'opacity-50 cursor-not-allowed'
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
          user.isActive ? 'translate-x-4' : 'translate-x-0.5'
        )}
      />
    </button>
  );
}

// ---- Main ----
export default function UsersPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [toggling, setToggling] = useState<Set<string>>(new Set());
  const [toggleError, setToggleError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await usersApi.list();
      setUsers(res.users);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar usuários.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (id: string, isActive: boolean) => {
    setToggling((prev) => new Set(prev).add(id));
    setToggleError(null);
    try {
      const res = await usersApi.update(id, { isActive });
      setUsers((prev) => prev.map((u) => (u.id === id ? res.user : u)));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao atualizar usuário.';
      setToggleError(msg);
      // Limpa o erro após 4s
      setTimeout(() => setToggleError(null), 4000);
    } finally {
      setToggling((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  return (
    <div>
      <PageHeader
        title="Usuários"
        description="Gerencie os agentes e administradores do sistema"
        action={
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Novo Agente
          </button>
        }
      />

      {toggleError && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive flex items-center gap-2">
          <span>⚠️</span>
          <span>{toggleError}</span>
        </div>
      )}
      {resetSuccess && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-green-500/10 border border-green-500/20 text-sm text-green-400 flex items-center gap-2">
          <span>✅</span>
          <span>{resetSuccess}</span>
        </div>
      )}
      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Nome</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">E-mail</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Role</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Último acesso</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground">Ativo</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td colSpan={6}><SkeletonRow /></td>
                    </tr>
                  ))
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <EmptyState
                        title="Nenhum usuário cadastrado"
                        description="Crie o primeiro agente para começar."
                        icon={<UserIcon className="w-6 h-6 text-muted-foreground" />}
                      />
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-border/50 hover:bg-muted/20 transition-colors cursor-pointer"
                      onClick={() => navigate(`/users/${user.id}`)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="relative">
                            <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                              <span className="text-[11px] font-semibold text-primary">
                                {user.name[0]?.toUpperCase()}
                              </span>
                            </div>
                            <span
                              className={cn(
                                'absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card',
                                user.isOnline ? 'bg-[#22c55e] animate-pulse' : 'bg-muted-foreground/40'
                              )}
                              title={user.isOnline ? 'Online' : 'Offline'}
                            />
                          </div>
                          <span className="font-medium text-foreground">{user.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {user.role === 'ADMIN' ? (
                            <Shield className="w-3 h-3 text-primary" />
                          ) : (
                            <MoreHorizontal className="w-3 h-3 text-muted-foreground" />
                          )}
                          <StatusBadge variant={user.role === 'ADMIN' ? 'primary' : 'muted'}>
                            {user.role}
                          </StatusBadge>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {user.isActive ? (
                          <span className="flex items-center gap-1 text-[#22c55e] text-xs">
                            <CheckCircle2 className="w-3 h-3" /> Ativo
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-muted-foreground text-xs">
                            <XCircle className="w-3 h-3" /> Inativo
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 shrink-0" />
                          {fmtDate(user.lastSeenAt)}
                        </div>
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <ToggleActive
                          user={user}
                          onToggle={handleToggle}
                          loading={toggling.has(user.id)}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {showModal && (
        <CreateUserModal
          onClose={() => setShowModal(false)}
          onCreated={load}
        />
      )}
    </div>
  );
}
