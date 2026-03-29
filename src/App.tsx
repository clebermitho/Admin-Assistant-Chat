import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ROUTE_PATHS } from '@/lib/index';
import { AuthProvider } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AdminLayout } from '@/components/AdminLayout';

import LoginPage      from '@/pages/Login';
import DashboardPage  from '@/pages/Dashboard';
import AnalyticsPage  from '@/pages/Analytics';
import UsersPage      from '@/pages/Users';
import UserDetailPage from '@/pages/UserDetail';
import SuggestionsPage from '@/pages/Suggestions';
import TemplatesPage  from '@/pages/Templates';
import PromptsPage    from '@/pages/Prompts';
import SettingsPage   from '@/pages/Settings';
import EventsPage     from '@/pages/Events';
import NotFound       from '@/pages/NotFound';

function Protected({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <AdminLayout>{children}</AdminLayout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public */}
          <Route path={ROUTE_PATHS.HOME}  element={<Navigate to={ROUTE_PATHS.DASHBOARD} replace />} />
          <Route path={ROUTE_PATHS.LOGIN} element={<LoginPage />} />

          {/* Protected */}
          <Route path={ROUTE_PATHS.DASHBOARD}   element={<Protected><DashboardPage /></Protected>} />
          <Route path={ROUTE_PATHS.ANALYTICS}   element={<Protected><AnalyticsPage /></Protected>} />
          <Route path={ROUTE_PATHS.USERS}        element={<Protected><UsersPage /></Protected>} />
          <Route path="/users/:id"               element={<Protected><UserDetailPage /></Protected>} />
          <Route path={ROUTE_PATHS.SUGGESTIONS}  element={<Protected><SuggestionsPage /></Protected>} />
          <Route path={ROUTE_PATHS.TEMPLATES}    element={<Protected><TemplatesPage /></Protected>} />
          <Route path={ROUTE_PATHS.PROMPTS}      element={<Protected><PromptsPage /></Protected>} />
          <Route path={ROUTE_PATHS.SETTINGS}     element={<Protected><SettingsPage /></Protected>} />
          <Route path={ROUTE_PATHS.EVENTS}       element={<Protected><EventsPage /></Protected>} />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
