import { memo } from 'react';
import { useTheme } from '@/shared/lib/hooks/useTheme/useTheme';
import { Theme } from '@/shared/const/theme';
import { Button } from '@/shared/ui';

interface ThemeSwitcherProps {
  className?: string;
}

export const ThemeSwitcher = memo(({ className }: ThemeSwitcherProps) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant='ghost'
      size='s'
      square
      className={className}
      onClick={toggleTheme}
      title={theme === Theme.DARK ? 'Светлая тема' : 'Тёмная тема'}
    >
      {theme === Theme.DARK ? '☀️' : '🌙'}
    </Button>
  );
});

ThemeSwitcher.displayName = 'ThemeSwitcher';
