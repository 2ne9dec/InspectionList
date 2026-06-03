import { useCallback, useContext } from 'react';
import { Theme } from '@/shared/const/theme';
import { LOCALSTORAGE_THEME_KEY } from '@/shared/const/localstorage';
import { ThemeContext } from '../../context/ThemeContext';

interface UseThemeResult {
  theme: Theme;
  toggleTheme: () => void;
}

/**
 * Возвращает текущую тему и функцию переключения.
 * Применение data-theme на body — ответственность ThemeProvider.
 */
export function useTheme(): UseThemeResult {
  const { theme, setTheme } = useContext(ThemeContext);

  const toggleTheme = useCallback(() => {
    const next = theme === Theme.DARK ? Theme.LIGHT : Theme.DARK;
    setTheme?.(next);
    try {
      localStorage.setItem(LOCALSTORAGE_THEME_KEY, next);
    } catch {
      // localStorage может быть недоступен в режиме инкогнито
    }
  }, [theme, setTheme]);

  return { theme: theme ?? Theme.DARK, toggleTheme };
}
