import { useEffect, useState, useCallback } from 'react';
import { Plus, Trash2, FileText, TrendingUp } from 'lucide-react';
import { templatesApi } from '@/api/client';
import type { Template } from '@/types';
import {
  Card,
  PageHeader,
  SkeletonBox,
  ErrorState,
  EmptyState,
  StatusBadge,
  Spinner,
} from '@/components/SharedUI';
import { SUGGESTION_CATEGORIES } from '@/lib/constants';

// ---- Score bar ----
function ScoreBar({ score }: { score: number }) {
  const pct = Math.min(Math.max(score * 100, 0), 100);
  const color = score > 0.7 ? '#22c55e' : score > 0.4 ? '#f59e0b' : '#ef4444';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden min-w-[60px]">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs text-muted-foreground font-mono w-8 text-right">
        {(score * 100).toFixed(0)}%
      </span>
    </div>
  );
}

// ---- Create Template Modal ----
interface CreateModalProps {
  onClose: () => void;
  onCreated: () => void;
}
function CreateTemplateModal({ onClose, onCreated }: CreateModalProps) {
  const [form, setForm] = useState({ category: 'NEGOCIACAO', text: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.text.trim()) {
      setError('O texto do template não pode estar vazio.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await templatesApi.create(form);
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar template.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Novo Template</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-lg leading-none">×</button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Categoria</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
            >
              {SUGGESTION_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Texto do Template</label>
            <textarea
              value={form.text}
              onChange={(e) => setForm({ ...form, text: e.target.value })}
              placeholder="Digite o texto do template de resposta..."
              rows={5}
              className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary resize-none"
            />
          </div>
          {error && (
            <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60">
              {loading ? <Spinner size="sm" /> : null}
              Criar Template
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---- Delete Confirm ----
interface DeleteConfirmProps {
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}
function DeleteConfirm({ onConfirm, onCancel, loading }: DeleteConfirmProps) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-2xl p-6">
        <h3 className="text-sm font-semibold text-foreground mb-2">Excluir template?</h3>
        <p className="text-xs text-muted-foreground mb-5">Esta ação não pode ser desfeita.</p>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-2.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
            Cancelar
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 transition-colors disabled:opacity-60">
            {loading ? <Spinner size="sm" /> : <Trash2 className="w-4 h-4" />}
            Excluir
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Main ----
export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await templatesApi.list(category || undefined);
      setTemplates(res.templates);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar templates.');
    } finally {
      setIsLoading(false);
    }
  }, [category]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await templatesApi.delete(deleteId);
      setTemplates((prev) => prev.filter((t) => t.id !== deleteId));
      setDeleteId(null);
    } catch {
      // silently fail
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Templates"
        description="Templates de resposta por categoria"
        action={
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Novo Template
          </button>
        }
      />

      {/* Category filter */}
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
          <button key={cat} onClick={() => setCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              category === cat
                ? 'bg-primary/15 border-primary/30 text-primary'
                : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}>
            {cat}
          </button>
        ))}
      </div>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : isLoading ? (
        <div className="grid gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4 space-y-2">
              <SkeletonBox className="h-4 w-1/4" />
              <SkeletonBox className="h-12 w-full" />
              <div className="flex gap-4">
                <SkeletonBox className="h-3 w-32" />
                <SkeletonBox className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>
      ) : templates.length === 0 ? (
        <Card>
          <EmptyState
            title="Nenhum template encontrado"
            description="Crie o primeiro template de resposta."
            icon={<FileText className="w-6 h-6 text-muted-foreground" />}
          />
        </Card>
      ) : (
        <div className="grid gap-3">
          {templates.map((t) => (
            <Card key={t.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <StatusBadge variant="primary">{t.category}</StatusBadge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" /> {t.usageCount} usos
                    </span>
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">{t.text}</p>
                  <div className="mt-3 max-w-xs">
                    <ScoreBar score={t.score} />
                  </div>
                </div>
                <button
                  onClick={() => setDeleteId(t.id)}
                  className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  title="Excluir template"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showModal && (
        <CreateTemplateModal
          onClose={() => setShowModal(false)}
          onCreated={load}
        />
      )}

      {deleteId && (
        <DeleteConfirm
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
          loading={deleting}
        />
      )}
    </div>
  );
}
