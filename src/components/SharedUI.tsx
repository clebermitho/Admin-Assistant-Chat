import { AlertCircle, RefreshCw, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================
// Shared UI Components
// ============================================================

// --- Skeleton ---
interface SkeletonBoxProps {
  className?: string;
}
export function SkeletonBox({ className }: SkeletonBoxProps) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-muted/60', className)}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <SkeletonBox className="h-4 w-1/3" />
      <SkeletonBox className="h-8 w-1/2" />
      <SkeletonBox className="h-3 w-2/3" />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 py-3 px-4">
      <SkeletonBox className="h-4 w-4 rounded-full" />
      <SkeletonBox className="h-4 flex-1" />
      <SkeletonBox className="h-4 w-24" />
      <SkeletonBox className="h-4 w-16" />
    </div>
  );
}

// --- Empty State ---
interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
}
export function EmptyState({
  title = 'Nenhum item encontrado',
  description = 'Não há dados para exibir no momento.',
  icon,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
        {icon ?? <Inbox className="w-6 h-6 text-muted-foreground" />}
      </div>
      <p className="text-sm font-medium text-foreground mb-1">{title}</p>
      <p className="text-xs text-muted-foreground max-w-xs">{description}</p>
    </div>
  );
}

// --- Error State ---
interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}
export function ErrorState({ message = 'Erro ao carregar dados.', onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
        <AlertCircle className="w-6 h-6 text-destructive" />
      </div>
      <p className="text-sm font-medium text-foreground mb-1">Algo deu errado</p>
      <p className="text-xs text-muted-foreground max-w-xs mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 text-xs text-primary hover:underline"
        >
          <RefreshCw className="w-3 h-3" />
          Tentar novamente
        </button>
      )}
    </div>
  );
}

// --- Page Header ---
interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}
export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

// --- Badge ---
interface BadgeProps {
  variant?: 'success' | 'danger' | 'warning' | 'muted' | 'primary';
  children: React.ReactNode;
  className?: string;
}
export function StatusBadge({ variant = 'muted', children, className }: BadgeProps) {
  const styles = {
    success: 'bg-[#22c55e]/15 text-[#22c55e] border-[#22c55e]/25',
    danger: 'bg-[#ef4444]/15 text-[#ef4444] border-[#ef4444]/25',
    warning: 'bg-[#f59e0b]/15 text-[#f59e0b] border-[#f59e0b]/25',
    primary: 'bg-primary/15 text-primary border-primary/25',
    muted: 'bg-muted text-muted-foreground border-border',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border',
        styles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

// --- Card ---
interface CardProps {
  children: React.ReactNode;
  className?: string;
}
export function Card({ children, className }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-card',
        className
      )}
    >
      {children}
    </div>
  );
}

// --- Loading Spinner ---
export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const s = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' }[size];
  return (
    <div
      className={cn(
        'border-2 border-primary border-t-transparent rounded-full animate-spin',
        s
      )}
    />
  );
}
