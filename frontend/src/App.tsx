import { Suspense, lazy, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { PermissionGuard } from '@/components/PermissionGuard';
import { Layout } from '@/components/Layout';
import { SettingsLayout } from '@/components/SettingsLayout';
import { CommandPalette } from '@/components/CommandPalette';
import { ToastContainer } from '@/components/Toast';
import { LoadingScreen } from '@/components/LoadingScreen';
import { ToastProvider, useToastContext } from '@/context/ToastContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { PERMISSIONS } from '@/lib/permissions';

const LoginPage = lazy(() => import('@/pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const DashboardPage = lazy(() => import('@/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const AlertsPage = lazy(() => import('@/pages/AlertsPage').then((m) => ({ default: m.AlertsPage })));
const IncidentsPage = lazy(() => import('@/pages/IncidentsPage').then((m) => ({ default: m.IncidentsPage })));
const ChangesPage = lazy(() => import('@/pages/ChangesPage').then((m) => ({ default: m.ChangesPage })));
const ServicesPage = lazy(() => import('@/pages/ServicesPage').then((m) => ({ default: m.ServicesPage })));
const NotificationSettingsPage = lazy(() =>
  import('@/pages/NotificationSettingsPage').then((m) => ({ default: m.NotificationSettingsPage }))
);
const OnCallPage = lazy(() => import('@/pages/OnCallPage').then((m) => ({ default: m.OnCallPage })));
const SettingsProfilePage = lazy(() => import('@/pages/SettingsProfilePage').then((m) => ({ default: m.SettingsProfilePage })));
const UnauthorizedPage = lazy(() => import('@/pages/UnauthorizedPage').then((m) => ({ default: m.UnauthorizedPage })));
const AdminConsolePage = lazy(() => import('@/pages/admin/AdminConsolePage').then((m) => ({ default: m.AdminConsolePage })));
const AdminUsersPage = lazy(() => import('@/pages/admin/AdminUsersPage').then((m) => ({ default: m.AdminUsersPage })));
const AdminSystemPage = lazy(() => import('@/pages/admin/AdminSystemPage').then((m) => ({ default: m.AdminSystemPage })));
const AdminDashboardConfigPage = lazy(() =>
  import('@/pages/admin/AdminDashboardConfigPage').then((m) => ({ default: m.AdminDashboardConfigPage }))
);
const AdminAuditPage = lazy(() => import('@/pages/admin/AdminAuditPage').then((m) => ({ default: m.AdminAuditPage })));
const AdminExportPage = lazy(() => import('@/pages/admin/AdminExportPage').then((m) => ({ default: m.AdminExportPage })));
const AdminWebhookIntegrationPage = lazy(() =>
  import('@/pages/admin/AdminWebhookIntegrationPage').then((m) => ({ default: m.AdminWebhookIntegrationPage }))
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <Suspense fallback={<LoadingScreen />}>
            <LoginPage />
          </Suspense>
        }
      />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route
                  path="/unauthorized"
                  element={
                    <Suspense fallback={<LoadingScreen />}>
                      <UnauthorizedPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/"
                  element={
                    <PermissionGuard permission={PERMISSIONS.DASHBOARD_VIEW}>
                      <Suspense fallback={<LoadingScreen />}>
                        <DashboardPage />
                      </Suspense>
                    </PermissionGuard>
                  }
                />
                <Route
                  path="/alerts"
                  element={
                    <PermissionGuard permission={PERMISSIONS.ALERTS_VIEW}>
                      <Suspense fallback={<LoadingScreen />}>
                        <AlertsPage />
                      </Suspense>
                    </PermissionGuard>
                  }
                />
                <Route
                  path="/incidents"
                  element={
                    <PermissionGuard permission={PERMISSIONS.INCIDENTS_VIEW}>
                      <Suspense fallback={<LoadingScreen />}>
                        <IncidentsPage />
                      </Suspense>
                    </PermissionGuard>
                  }
                />
                <Route
                  path="/changes"
                  element={
                    <PermissionGuard permission={PERMISSIONS.CHANGES_VIEW}>
                      <Suspense fallback={<LoadingScreen />}>
                        <ChangesPage />
                      </Suspense>
                    </PermissionGuard>
                  }
                />
                <Route
                  path="/services"
                  element={
                    <PermissionGuard permission={PERMISSIONS.SERVICES_VIEW}>
                      <Suspense fallback={<LoadingScreen />}>
                        <ServicesPage />
                      </Suspense>
                    </PermissionGuard>
                  }
                />
                <Route path="/on-call" element={<Navigate to="/settings/on-call" replace />} />
                <Route
                  path="/settings"
                  element={
                    <PermissionGuard permission={PERMISSIONS.SETTINGS_VIEW}>
                      <SettingsLayout />
                    </PermissionGuard>
                  }
                >
                  <Route
                    index
                    element={
                      <Suspense fallback={<LoadingScreen />}>
                        <SettingsProfilePage />
                      </Suspense>
                    }
                  />
                  <Route
                    path="notifications"
                    element={
                      <PermissionGuard permission={PERMISSIONS.SETTINGS_NOTIFICATIONS}>
                        <Suspense fallback={<LoadingScreen />}>
                          <NotificationSettingsPage />
                        </Suspense>
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="on-call"
                    element={
                      <PermissionGuard permission={PERMISSIONS.SETTINGS_ON_CALL}>
                        <Suspense fallback={<LoadingScreen />}>
                          <OnCallPage />
                        </Suspense>
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="admin"
                    element={
                      <PermissionGuard permission={PERMISSIONS.USERS_MANAGE}>
                        <Suspense fallback={<LoadingScreen />}>
                          <AdminConsolePage />
                        </Suspense>
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="users-teams"
                    element={
                      <PermissionGuard permission={PERMISSIONS.USERS_MANAGE}>
                        <Suspense fallback={<LoadingScreen />}>
                          <AdminUsersPage />
                        </Suspense>
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="system"
                    element={
                      <PermissionGuard permission={PERMISSIONS.SYSTEM_CONFIG}>
                        <Suspense fallback={<LoadingScreen />}>
                          <AdminSystemPage />
                        </Suspense>
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="dashboard-config"
                    element={
                      <PermissionGuard permission={PERMISSIONS.DASHBOARD_MANAGE}>
                        <Suspense fallback={<LoadingScreen />}>
                          <AdminDashboardConfigPage />
                        </Suspense>
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="audit"
                    element={
                      <PermissionGuard permission={PERMISSIONS.AUDIT_VIEW}>
                        <Suspense fallback={<LoadingScreen />}>
                          <AdminAuditPage />
                        </Suspense>
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="export"
                    element={
                      <PermissionGuard permission={PERMISSIONS.EXPORT_DATA}>
                        <Suspense fallback={<LoadingScreen />}>
                          <AdminExportPage />
                        </Suspense>
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="webhooks"
                    element={
                      <PermissionGuard permission={PERMISSIONS.INTEGRATIONS_MANAGE}>
                        <Suspense fallback={<LoadingScreen />}>
                          <AdminWebhookIntegrationPage />
                        </Suspense>
                      </PermissionGuard>
                    }
                  />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

function AppShell() {
  const { toasts, remove } = useToastContext();
  const { token, landingPage } = useAuth();

  useEffect(() => {
    if (!token) return;
    // Prefetch dashboard stats so the landing page renders instantly
    queryClient.prefetchQuery({
      queryKey: ['dashboard-stats', 'week'],
      queryFn: () => api.getDashboardStats('week'),
      staleTime: 30000,
    });
    // Prefetch common landing-page data based on role
    if (landingPage === '/alerts') {
      queryClient.prefetchQuery({ queryKey: ['alerts', 'all'], queryFn: () => api.getAlerts() });
    } else if (landingPage === '/changes') {
      queryClient.prefetchQuery({ queryKey: ['changes'], queryFn: api.getChanges });
    }
  }, [token, landingPage]);

  return (
    <>
      <AppRoutes />
      <CommandPalette />
      <ToastContainer toasts={toasts} onRemove={remove} />
    </>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <AppShell />
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
