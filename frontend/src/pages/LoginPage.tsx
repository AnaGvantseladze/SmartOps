import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Shield, Wrench, BarChart3, LogIn } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface DemoUser {
  email: string;
  password: string;
  role: string;
  landing_page: string;
}

const DEMO_ACCOUNTS: DemoUser[] = [
  {
    email: 'admin@opscore.com',
    password: 'admin123',
    role: 'Administrator',
    landing_page: '/',
  },
  {
    email: 'toma@opscore.com',
    password: 'engineer123',
    role: 'Engineer',
    landing_page: '/alerts',
  },
  {
    email: 'cto@opscore.com',
    password: 'manager123',
    role: 'Manager',
    landing_page: '/',
  },
];

const roleIcons: Record<string, React.ElementType> = {
  Administrator: Shield,
  Engineer: Wrench,
  Manager: BarChart3,
};

export function LoginPage() {
  const { login, user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (loginEmail: string, loginPassword: string) => {
    setError('');
    setLoading(true);
    try {
      const landingPage = await login(loginEmail, loginPassword);
      navigate(landingPage);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleLogin(email, password);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ops-bg text-slate-400">
        Loading...
      </div>
    );
  }

  if (user) {
    const landing = DEMO_ACCOUNTS.find((a) => a.email === user.email)?.landing_page ?? '/';
    return <Navigate to={landing} replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ops-bg p-4">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-ops-accent text-xl font-bold text-white">
            OC
          </div>
          <h1 className="text-2xl font-bold text-white">OpsCore</h1>
          <p className="mt-1 text-slate-400">Unified Service Lifecycle Platform</p>
        </div>

        <div className="card p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Sign in</h2>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm text-slate-400">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-ops-border bg-ops-bg px-3 py-2 text-white focus:border-ops-accent focus:outline-none"
                placeholder="you@opscore.com"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-400">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-ops-border bg-ops-bg px-3 py-2 text-white focus:border-ops-accent focus:outline-none"
                placeholder="••••••••"
                required
              />
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button type="submit" className="btn-primary w-full justify-center py-2" disabled={loading}>
              <LogIn className="h-4 w-4" />
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>

        <div className="mt-6">
          <p className="mb-3 text-center text-sm text-slate-500">Quick login — demo accounts</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {DEMO_ACCOUNTS.map((account) => {
              const Icon = roleIcons[account.role] ?? Shield;
              return (
                <button
                  key={account.email}
                  onClick={() => handleLogin(account.email, account.password)}
                  disabled={loading}
                  className="card p-4 text-left transition-colors hover:border-ops-accent/50 disabled:opacity-50"
                >
                  <Icon className="mb-2 h-5 w-5 text-ops-accent" />
                  <div className="font-medium text-white">{account.role}</div>
                  <div className="mt-1 text-xs text-slate-500">{account.email}</div>
                  <div className="mt-2 font-mono text-xs text-slate-600">{account.password}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
