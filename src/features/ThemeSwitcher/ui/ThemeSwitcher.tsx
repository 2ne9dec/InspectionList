import { memo } from 'react';
import { useTheme } from '@/shared/lib/hooks/useTheme/useTheme';
import { Theme } from '@/shared/const/theme';
import cls from './ThemeSwitcher.module.scss';

interface ThemeSwitcherProps {
  className?: string;
}

export const ThemeSwitcher = memo(({ className }: ThemeSwitcherProps) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      className={`${cls.btn} ${className ?? ''}`}
      onClick={toggleTheme}
      title={theme === Theme.DARK ? 'Светлая тема' : 'Тёмная тема'}
    >
      {theme === Theme.DARK ? '☀️' : '🌙'}
    </button>
  );
});

ThemeSwitcher.displayName = 'ThemeSwitcher';
