import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Shield, Wrench, BarChart3, LogIn, GitPullRequest } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface DemoUser {
  email: string;
  password: string;
  role: string;
}

const DEMO_ACCOUNTS: DemoUser[] = [
  { email: 'admin@opscore.com', password: 'admin123', role: 'Administrator' },
  { email: 'sre@opscore.com', password: 'engineer123', role: 'SRE Engineer' },
  { email: 'cto@opscore.com', password: 'manager123', role: 'Manager' },
  { email: 'change@opscore.com', password: 'change123', role: 'Change Manager' },
];

const roleIcons: Record<string, React.ElementType> = {
  Administrator: Shield,
  'SRE Engineer': Wrench,
  Manager: BarChart3,
  'Change Manager': GitPullRequest,
};

export function LoginPage() {
  const { login, user, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const from = (location.state as { from?: string })?.from;

  const handleLogin = async (loginEmail: string, loginPassword: string) => {
    setError('');
    setLoading(true);
    try {
      const landingPage = await login(loginEmail, loginPassword);
      navigate(from ?? landingPage);
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
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">
        Loading...
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-3xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-brand-900 text-xl font-bold text-white">
            SO
          </div>
          <h1 className="font-display text-2xl font-bold text-slate-900">SmartOps</h1>
          <p className="mt-1 text-slate-500">Unified service-lifecycle platform</p>
        </div>

        <div className="card p-6">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Sign in</h2>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="you@opscore.com"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
                required
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button type="submit" className="btn-primary w-full justify-center py-2" disabled={loading}>
              <LogIn className="h-4 w-4" />
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>

        <div className="mt-6">
          <p className="mb-3 text-center text-sm text-slate-500">Quick login — one account per role</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {DEMO_ACCOUNTS.map((account) => {
              const Icon = roleIcons[account.role] ?? Shield;
              return (
                <button
                  key={account.email}
                  onClick={() => handleLogin(account.email, account.password)}
                  disabled={loading}
                  className="card p-4 text-left transition-all hover:border-brand-300 hover:shadow-md disabled:opacity-50"
                >
                  <Icon className="mb-2 h-5 w-5 text-brand-600" />
                  <div className="font-medium text-slate-900">{account.role}</div>
                  <div className="mt-1 text-xs text-slate-500">{account.email}</div>
                  <div className="mt-2 font-mono text-xs text-slate-400">{account.password}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
