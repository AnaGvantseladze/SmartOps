import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from '@/components/ProtectedRoute';
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
                <Route path="/" element={<DashboardPage />} />
                <Route path="/alerts" element={<AlertsPage />} />
                <Route path="/incidents" element={<IncidentsPage />} />
                <Route path="/changes" element={<ChangesPage />} />
                <Route path="/services" element={<ServicesPage />} />
                <Route path="/on-call" element={<Navigate to="/settings/on-call" replace />} />
                <Route path="/settings" element={<SettingsLayout />}>
                  <Route index element={<SettingsProfilePage />} />
                  <Route path="notifications" element={<NotificationSettingsPage />} />
                  <Route path="on-call" element={<OnCallPage />} />
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
