export type ThemeMode = 'light' | 'dark' | 'system';

export const THEME_STORAGE_KEY = 'smartops_theme';

export function isThemeMode(value: string | null): value is ThemeMode {
  return value === 'light' || value === 'dark' || value === 'system';
}

export function getStoredTheme(): ThemeMode {
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return isThemeMode(stored) ? stored : 'system';
}

export function getSystemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function resolveDarkMode(mode: ThemeMode): boolean {
  if (mode === 'dark') return true;
  if (mode === 'light') return false;
  return getSystemPrefersDark();
}

export function applyTheme(mode: ThemeMode): void {
  const root = document.documentElement;
  const isDark = resolveDarkMode(mode);

  if (isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  root.style.colorScheme = isDark ? 'dark' : 'light';
}

export function initTheme(): ThemeMode {
  const mode = getStoredTheme();
  applyTheme(mode);
  return mode;
}
