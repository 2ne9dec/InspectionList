import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { LOCALSTORAGE_THEME_KEY } from '@/shared/const/localstorage';
import { Theme } from '@/shared/const/theme';
import { ThemeContext } from '@/shared/lib/context/ThemeContext';

function readInitialTheme(): Theme {
  if (typeof window === 'undefined') return Theme.DARK;
  try {
    const stored = localStorage.getItem(LOCALSTORAGE_THEME_KEY);
    if (stored === Theme.LIGHT || stored === Theme.DARK) return stored;
  } catch {
    // localStorage может быть недоступен в режиме инкогнито
  }
  return window.matchMedia?.('(prefers-color-scheme: light)').matches
    ? Theme.LIGHT
    : Theme.DARK;
}

const initialTheme = readInitialTheme();
// Применяем тему синхронно ДО первого рендера React, чтобы убрать FOUC
if (typeof document !== 'undefined') {
  document.body.setAttribute('data-theme', initialTheme);
}

interface ThemeProviderProps {
  /** Внешний override стартовой темы (для тестов / SSR). */
  initialTheme?: Theme;
  children: ReactNode;
}

export const ThemeProvider = ({ initialTheme: override, children }: ThemeProviderProps) => {
  const [theme, setTheme] = useState<Theme>(override ?? initialTheme);

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
  }, [theme]);

  const value = useMemo(() => ({ theme, setTheme }), [theme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
