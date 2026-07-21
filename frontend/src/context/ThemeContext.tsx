import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useState } from 'react';
import {
  applyTheme,
  getStoredTheme,
  getSystemPrefersDark,
  initTheme,
  THEME_STORAGE_KEY,
  type ThemeMode,
} from '@/lib/theme';

interface ThemeContextValue {
  theme: ThemeMode;
  isDark: boolean;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => initTheme());
  const [systemDark, setSystemDark] = useState(() => getSystemPrefersDark());

  const setTheme = useCallback((mode: ThemeMode) => {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
    setThemeState(mode);
    applyTheme(mode);
  }, []);

  useLayoutEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useLayoutEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event: MediaQueryListEvent) => {
      setSystemDark(event.matches);
      if (theme === 'system') {
        applyTheme('system');
      }
    };

    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      isDark: theme === 'system' ? systemDark : theme === 'dark',
      setTheme,
    }),
    [theme, systemDark, setTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
