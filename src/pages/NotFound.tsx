import { Link } from 'react-router-dom';
import { ROUTE_PATHS } from '@/lib/constants';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
      <p className="text-6xl font-bold text-muted-foreground/30 font-mono">404</p>
      <p className="text-sm text-muted-foreground">Página não encontrada.</p>
      <Link to={ROUTE_PATHS.DASHBOARD} className="text-sm text-primary hover:underline">
        Voltar ao Dashboard
      </Link>
    </div>
  );
}
