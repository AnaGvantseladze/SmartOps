import { ShieldX } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { ROLE_LABELS } from '@/lib/permissions';

export function UnauthorizedPage() {
  const { user } = useAuth();

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-8 text-center">
      <ShieldX className="mb-4 h-16 w-16 text-red-400" />
      <h1 className="text-2xl font-bold text-white">Access Denied</h1>
      <p className="mt-2 max-w-md text-slate-400">
        Your role ({user ? ROLE_LABELS[user.role] ?? user.role : 'unknown'}) does not have permission
        to access this page.
      </p>
      <Link to="/" className="btn-primary mt-6">
        Go to your dashboard
      </Link>
    </div>
  );
}
