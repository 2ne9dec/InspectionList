import { memo } from 'react';
import { useTheme } from '@/shared/lib/hooks/useTheme/useTheme';
import { Theme } from '@/shared/const/theme';
import { Button } from '@/shared/ui';
import { IconMoon, IconSun } from '@/shared/ui/Icons';

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
      aria-label={theme === Theme.DARK ? 'Включить светлую тему' : 'Включить тёмную тему'}
      title={theme === Theme.DARK ? 'Светлая тема' : 'Тёмная тема'}
    >
      {theme === Theme.DARK
        ? <IconSun size={16} aria-hidden />
        : <IconMoon size={16} aria-hidden />}
    </Button>
  );
});

ThemeSwitcher.displayName = 'ThemeSwitcher';
