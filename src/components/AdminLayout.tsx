import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  MessageSquareText,
  FileText,
  Settings,
  LogOut,
  Activity,
  ChevronRight,
  Clock,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ROUTE_PATHS } from '@/lib/constants';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { to: ROUTE_PATHS.DASHBOARD,   icon: LayoutDashboard, label: 'Dashboard' },
  { to: ROUTE_PATHS.USERS,       icon: Users,           label: 'Usuários' },
  { to: ROUTE_PATHS.SUGGESTIONS, icon: MessageSquare,   label: 'Sugestões' },
  { to: ROUTE_PATHS.TEMPLATES,   icon: FileText,        label: 'Templates' },
  { to: ROUTE_PATHS.PROMPTS,     icon: MessageSquareText, label: 'Prompts' },
  { to: ROUTE_PATHS.SETTINGS,    icon: Settings,        label: 'Configurações' },
  { to: ROUTE_PATHS.EVENTS,      icon: Clock,           label: 'Eventos' },
] as const;

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate(ROUTE_PATHS.LOGIN);
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside
        className="w-[240px] shrink-0 flex flex-col border-r border-border"
        style={{ background: 'oklch(0.10 0.018 220)' }}
      >
        {/* Logo */}
        <div className="h-[60px] flex items-center gap-3 px-5 border-b border-border">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <Activity className="w-4 h-4 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground leading-none">Chatplay</p>
            <p className="text-xs text-muted-foreground mt-0.5">Admin Panel</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all duration-150',
                  isActive
                    ? 'bg-primary/15 text-primary font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-primary' : '')} />
                  <span className="flex-1">{label}</span>
                  {isActive && <ChevronRight className="w-3 h-3 text-primary/60" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User info */}
        <div className="px-3 pb-4 border-t border-border pt-3">
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-md">
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <span className="text-xs font-semibold text-primary">
                {user?.name?.[0]?.toUpperCase() ?? 'A'}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-foreground truncate">{user?.name}</p>
              <p className="text-[11px] text-muted-foreground">{user?.role}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header
          className="h-[60px] shrink-0 flex items-center justify-between px-6 border-b border-border"
          style={{ background: 'oklch(0.12 0.015 220)' }}
        >
          <div />
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-foreground">{user?.name}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-destructive transition-colors px-3 py-1.5 rounded-md hover:bg-destructive/10"
            >
              <LogOut className="w-4 h-4" />
              <span>Sair</span>
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
