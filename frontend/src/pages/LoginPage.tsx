import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, GitPullRequest, Lock, Mail, Shield, UserCog, Wrench } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

interface DemoUser {
  name: string;
  email: string;
  password: string;
  role: string;
  icon: typeof Shield;
  accent: string;
  iconBg: string;
}

const DEMO_ACCOUNTS: DemoUser[] = [
  {
    name: 'Saba Kekelia',
    email: 'saba.kekelia@btu.edu.ge',
    password: 'engineer123',
    role: 'Administrator',
    icon: Shield,
    accent: 'border-brand-200 hover:border-brand-300 hover:bg-brand-50/60',
    iconBg: 'bg-brand-100 text-brand-700',
  },
  {
    name: 'Ana Gvantseladze',
    email: 'ana.gvantseladze@btu.edu.ge',
    password: 'engineer123',
    role: 'Manager',
    icon: UserCog,
    accent: 'border-amber-200 hover:border-amber-300 hover:bg-amber-50/60',
    iconBg: 'bg-amber-100 text-amber-700',
  },
  {
    name: 'Eka Kesanashvili',
    email: 'eka.kesanashvili@btu.edu.ge',
    password: 'engineer123',
    role: 'SRE Engineer',
    icon: Wrench,
    accent: 'border-sky-200 hover:border-sky-300 hover:bg-sky-50/60',
    iconBg: 'bg-sky-100 text-sky-700',
  },
  {
    name: 'Giorgi Tabatadze',
    email: 'giorgi.tabatadze@btu.edu.ge',
    password: 'engineer123',
    role: 'Change Manager',
    icon: GitPullRequest,
    accent: 'border-violet-200 hover:border-violet-300 hover:bg-violet-50/60',
    iconBg: 'bg-violet-100 text-violet-700',
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
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-brand-50 to-slate-100 text-slate-500">
        Loading...
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-brand-50/70 to-slate-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl items-center justify-center">
        <div className="grid w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_20px_60px_-24px_rgba(21,24,41,0.35)] lg:grid-cols-[1.05fr_1fr]">
          <section className="relative hidden overflow-hidden bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700 p-10 text-white lg:flex lg:flex-col lg:justify-between">
            <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-brand-500/20 blur-3xl" />

            <div className="relative">
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-lg font-bold backdrop-blur-sm">
                SO
              </div>
              <h1 className="font-display text-3xl font-semibold tracking-tight">SmartOps</h1>
              <p className="mt-3 max-w-sm text-sm leading-6 text-brand-100">
                Unified alert, incident, and change management for teams who need clarity when systems get noisy.
              </p>
            </div>

            <div className="relative space-y-3 text-sm text-brand-100">
              <p className="font-medium text-white">What you can do here</p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-300" />
                  Triage alerts and coordinate incidents
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-300" />
                  Submit and review change requests
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-300" />
                  Monitor service health across tiers
                </li>
              </ul>
            </div>
          </section>

          <section className="p-6 sm:p-8 lg:p-10">
            <div className="mb-8 lg:hidden">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-900 text-lg font-bold text-white">
                SO
              </div>
              <h1 className="font-display text-2xl font-semibold text-slate-900">SmartOps</h1>
              <p className="mt-1 text-sm text-slate-500">Unified service-lifecycle platform</p>
            </div>

            <div className="mb-8">
              <h2 className="font-display text-2xl font-semibold text-slate-900">Welcome back</h2>
              <p className="mt-1 text-sm text-slate-500">Sign in with your BTU account to continue.</p>
            </div>

            <form onSubmit={onSubmit} className="space-y-5">
              <div>
                <label htmlFor="login-email" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Email
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input w-full py-2.5 pl-10"
                    placeholder="you@btu.edu.ge"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="login-password" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    id="login-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input w-full py-2.5 pl-10"
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="btn-primary w-full justify-center py-2.5 text-sm shadow-sm"
                disabled={loading}
              >
                {loading ? (
                  'Signing in...'
                ) : (
                  <>
                    Sign in
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            <div className="my-8 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs font-medium uppercase tracking-wide text-slate-400">Demo access</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2">
              {DEMO_ACCOUNTS.map((account) => {
                const Icon = account.icon;
                return (
                  <button
                    key={account.email}
                    type="button"
                    onClick={() => handleLogin(account.email, account.password)}
                    disabled={loading}
                    title={`${account.role} — ${account.name}`}
                    className={cn(
                      'group flex min-w-0 items-center gap-3 rounded-xl border bg-white p-3.5 text-left transition-all hover:shadow-md disabled:opacity-50',
                      account.accent
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-transform group-hover:scale-105',
                        account.iconBg
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-slate-900">{account.role}</div>
                      <div className="truncate text-xs text-slate-500">{account.name}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
