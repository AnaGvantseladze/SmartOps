import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { LogIn, Shield, UserCog, Wrench } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface DemoUser {
  name: string;
  email: string;
  password: string;
  role: string;
  icon: typeof Shield;
}

const DEMO_ACCOUNTS: DemoUser[] = [
  {
    name: 'Saba Kekelia',
    email: 'saba.kekelia@btu.edu.ge',
    password: 'engineer123',
    role: 'Administrator',
    icon: Shield,
  },
  {
    name: 'Ana Gvantseladze',
    email: 'ana.gvantseladze@btu.edu.ge',
    password: 'engineer123',
    role: 'Manager',
    icon: UserCog,
  },
  {
    name: 'Eka Kesanashvili',
    email: 'eka.kesanashvili@btu.edu.ge',
    password: 'engineer123',
    role: 'SRE Engineer',
    icon: Wrench,
  },
];

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
                placeholder="you@btu.edu.ge"
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
          <p className="mb-3 text-center text-sm text-slate-500">Quick login — demo accounts</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {DEMO_ACCOUNTS.map((account) => {
              const Icon = account.icon;
              return (
                <button
                  key={account.email}
                  onClick={() => handleLogin(account.email, account.password)}
                  disabled={loading}
                  className="card p-4 text-left transition-all hover:border-brand-300 hover:shadow-md disabled:opacity-50"
                >
                  <Icon className="mb-2 h-5 w-5 text-brand-600" />
                  <div className="font-medium text-slate-900">{account.name}</div>
                  <div className="mt-1 text-xs font-medium text-brand-700">{account.role}</div>
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
