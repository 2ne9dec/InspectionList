import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { ThemeProvider } from '@/app/providers/ThemeProvider';
import { Theme } from '@/shared/const/theme';
import { LOCALSTORAGE_THEME_KEY } from '@/shared/const/localstorage';
import { ThemeSwitcher } from './ThemeSwitcher';

describe('ThemeSwitcher', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.removeAttribute('data-theme');
  });

  it('переключает тему и сохраняет выбор', () => {
    render(
      <ThemeProvider>
        <ThemeSwitcher />
      </ThemeProvider>,
    );

    fireEvent.click(screen.getByRole('button'));

    expect(document.body.getAttribute('data-theme')).toBe(Theme.LIGHT);
    expect(localStorage.getItem(LOCALSTORAGE_THEME_KEY)).toBe(Theme.LIGHT);
  });
});
