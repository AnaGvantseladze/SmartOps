import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { PermissionGuard } from '@/components/PermissionGuard';
import { Layout } from '@/components/Layout';
import { SettingsLayout } from '@/components/SettingsLayout';
import { AuthProvider } from '@/context/AuthContext';
import { AlertsPage } from '@/pages/AlertsPage';
import { ChangesPage } from '@/pages/ChangesPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { IncidentsPage } from '@/pages/IncidentsPage';
import { LoginPage } from '@/pages/LoginPage';
import { NotificationSettingsPage } from '@/pages/NotificationSettingsPage';
import { OnCallPage } from '@/pages/OnCallPage';
import { ServicesPage } from '@/pages/ServicesPage';
import { SettingsProfilePage } from '@/pages/SettingsProfilePage';
import { UnauthorizedPage } from '@/pages/UnauthorizedPage';
import { AdminAuditPage } from '@/pages/admin/AdminAuditPage';
import { AdminConsolePage } from '@/pages/admin/AdminConsolePage';
import { AdminDashboardConfigPage } from '@/pages/admin/AdminDashboardConfigPage';
import { AdminExportPage } from '@/pages/admin/AdminExportPage';
import { AdminSystemPage } from '@/pages/admin/AdminSystemPage';
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage';
import { PERMISSIONS } from '@/lib/permissions';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000,
      retry: 1,
    },
  },
});

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/unauthorized" element={<UnauthorizedPage />} />
                <Route
                  path="/"
                  element={
                    <PermissionGuard permission={PERMISSIONS.DASHBOARD_VIEW}>
                      <DashboardPage />
                    </PermissionGuard>
                  }
                />
                <Route
                  path="/alerts"
                  element={
                    <PermissionGuard permission={PERMISSIONS.ALERTS_VIEW}>
                      <AlertsPage />
                    </PermissionGuard>
                  }
                />
                <Route
                  path="/incidents"
                  element={
                    <PermissionGuard permission={PERMISSIONS.INCIDENTS_VIEW}>
                      <IncidentsPage />
                    </PermissionGuard>
                  }
                />
                <Route
                  path="/changes"
                  element={
                    <PermissionGuard permission={PERMISSIONS.CHANGES_VIEW}>
                      <ChangesPage />
                    </PermissionGuard>
                  }
                />
                <Route
                  path="/services"
                  element={
                    <PermissionGuard permission={PERMISSIONS.SERVICES_VIEW}>
                      <ServicesPage />
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
                  <Route index element={<SettingsProfilePage />} />
                  <Route
                    path="notifications"
                    element={
                      <PermissionGuard permission={PERMISSIONS.SETTINGS_NOTIFICATIONS}>
                        <NotificationSettingsPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="on-call"
                    element={
                      <PermissionGuard permission={PERMISSIONS.SETTINGS_ON_CALL}>
                        <OnCallPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="admin"
                    element={
                      <PermissionGuard permission={PERMISSIONS.USERS_MANAGE}>
                        <AdminConsolePage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="users-teams"
                    element={
                      <PermissionGuard permission={PERMISSIONS.USERS_MANAGE}>
                        <AdminUsersPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="system"
                    element={
                      <PermissionGuard permission={PERMISSIONS.SYSTEM_CONFIG}>
                        <AdminSystemPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="dashboard-config"
                    element={
                      <PermissionGuard permission={PERMISSIONS.DASHBOARD_MANAGE}>
                        <AdminDashboardConfigPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="audit"
                    element={
                      <PermissionGuard permission={PERMISSIONS.AUDIT_VIEW}>
                        <AdminAuditPage />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="export"
                    element={
                      <PermissionGuard permission={PERMISSIONS.EXPORT_DATA}>
                        <AdminExportPage />
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

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
