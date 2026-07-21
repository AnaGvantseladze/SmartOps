import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { UserProfile } from '@/types';

const TOKEN_KEY = 'opscore_token';
const USER_KEY = 'opscore_user';
const PERMS_KEY = 'opscore_permissions';
const NAV_KEY = 'opscore_nav';
const ALERT_SCOPE_KEY = 'opscore_alert_scope';
const LANDING_KEY = 'opscore_landing';

export interface RoleConfig {
  role: string;
  role_label: string;
  permissions: string[];
  landing_page: string;
  nav_items: string[];
  alert_scope: string;
}

interface AuthContextValue {
  user: UserProfile | null;
  token: string | null;
  permissions: string[];
  navItems: string[];
  alertScope: string;
  landingPage: string;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<string>;
  logout: () => void;
  can: (permission: string) => boolean;
  canAny: (permissions: string[]) => boolean;
  canNav: (item: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function loadStored<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : fallback;
  } catch {
    return fallback;
  }
}

function loadStoredUser(): UserProfile | null {
  const user = loadStored<UserProfile | null>(USER_KEY, null);
  if (user?.role) {
    (window as { __smartops_role?: string }).__smartops_role = user.role;
  }
  return user;
}

function loadStoredPermissions(): string[] {
  return loadStored<string[]>(PERMS_KEY, []);
}

function loadStoredNav(): string[] {
  return loadStored<string[]>(NAV_KEY, []);
}

function persistRoleConfig(config: Partial<RoleConfig>) {
  if (config.permissions) localStorage.setItem(PERMS_KEY, JSON.stringify(config.permissions));
  if (config.nav_items) localStorage.setItem(NAV_KEY, JSON.stringify(config.nav_items));
  if (config.alert_scope) localStorage.setItem(ALERT_SCOPE_KEY, config.alert_scope);
  if (config.landing_page) localStorage.setItem(LANDING_KEY, config.landing_page);
}

function clearRoleConfig() {
  localStorage.removeItem(PERMS_KEY);
  localStorage.removeItem(NAV_KEY);
  localStorage.removeItem(ALERT_SCOPE_KEY);
  localStorage.removeItem(LANDING_KEY);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(loadStoredUser);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [permissions, setPermissions] = useState<string[]>(loadStoredPermissions);
  const [navItems, setNavItems] = useState<string[]>(loadStoredNav);
  const [alertScope, setAlertScope] = useState(() => localStorage.getItem(ALERT_SCOPE_KEY) ?? 'all');
  const [landingPage, setLandingPage] = useState(() => localStorage.getItem(LANDING_KEY) ?? '/');
  const [isLoading, setIsLoading] = useState(true);

  const applyRoleConfig = useCallback((config: RoleConfig) => {
    setPermissions(config.permissions);
    setNavItems(config.nav_items);
    setAlertScope(config.alert_scope);
    setLandingPage(config.landing_page);
    persistRoleConfig(config);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    clearRoleConfig();
    setToken(null);
    setUser(null);
    setPermissions([]);
    setNavItems([]);
  }, []);

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    // Render immediately with cached data, then refresh in background.
    setIsLoading(false);

    const refreshSession = async () => {
      try {
        const res = await fetch('/api/v1/auth/session', {
          headers: { Authorization: `Bearer ${token}` },
        });

        // Only a 401 means the session is actually invalid; everything else should not log the user out.
        if (res.status === 401) {
          logout();
          return;
        }

        // If the combined /session endpoint is missing (e.g. stale backend process), fall back to the legacy endpoints.
        if (res.status === 404) {
          const [meRes, permsRes] = await Promise.all([
            fetch('/api/v1/auth/me', { headers: { Authorization: `Bearer ${token}` } }),
            fetch('/api/v1/auth/permissions', { headers: { Authorization: `Bearer ${token}` } }),
          ]);
          if (meRes.status === 401 || permsRes.status === 401) {
            logout();
            return;
          }
          if (!meRes.ok || !permsRes.ok) return;
          const me = await meRes.json();
          const perms = await permsRes.json();
          setUser(me);
          localStorage.setItem(USER_KEY, JSON.stringify(me));
          applyRoleConfig({
            role: me.role,
            role_label: perms.role_label,
            permissions: perms.permissions,
            landing_page: perms.landing_page,
            nav_items: perms.nav_items,
            alert_scope: perms.alert_scope,
          });
          return;
        }

        if (!res.ok) return;
        const data = await res.json();
        setUser(data.user);
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        applyRoleConfig({
          role: data.role,
          role_label: data.role_label,
          permissions: data.permissions,
          landing_page: data.landing_page,
          nav_items: data.nav_items,
          alert_scope: data.alert_scope,
        });
      } catch {
        // Network or transient errors keep the cached session so the UI does not loop back to login.
      }
    };

    refreshSession();
  }, [token, logout, applyRoleConfig]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail ?? 'Login failed');
    }
    const data = await res.json();
    localStorage.setItem(TOKEN_KEY, data.access_token);
    localStorage.setItem(USER_KEY, JSON.stringify(data.user));
    setToken(data.access_token);
    setUser(data.user);
    // Surface the role globally so error boundaries can include it in reports.
    (window as { __smartops_role?: string }).__smartops_role = data.user.role;
    applyRoleConfig({
      role: data.user.role,
      role_label: data.user.role,
      permissions: data.permissions ?? [],
      nav_items: data.nav_items ?? [],
      alert_scope: data.alert_scope ?? 'all',
      landing_page: data.landing_page ?? '/',
    });
    return data.landing_page as string;
  }, [applyRoleConfig]);

  const can = useCallback((permission: string) => permissions.includes(permission), [permissions]);
  const canAny = useCallback(
    (perms: string[]) => perms.some((p) => permissions.includes(p)),
    [permissions]
  );
  const canNav = useCallback(
    (item: string) => {
      if (navItems.length > 0) return navItems.includes(item);
      return true;
    },
    [navItems]
  );

  const value = useMemo(
    () => ({
      user,
      token,
      permissions,
      navItems,
      alertScope,
      landingPage,
      isLoading,
      login,
      logout,
      can,
      canAny,
      canNav,
    }),
    [user, token, permissions, navItems, alertScope, landingPage, isLoading, login, logout, can, canAny, canNav]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}
