import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { canAccessRoute } from '@/lib/permissions';

export function PermissionGuard({
  permission,
  children,
}: {
  permission?: string | string[];
  children: React.ReactNode;
}) {
  const { can, canAny } = useAuth();

  if (permission) {
    const allowed = Array.isArray(permission) ? canAny(permission) : can(permission);
    if (!allowed) return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}

export function RoutePermissionGuard({
  path,
  children,
}: {
  path: string;
  children: React.ReactNode;
}) {
  const { permissions } = useAuth();

  if (!canAccessRoute(permissions, path)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
