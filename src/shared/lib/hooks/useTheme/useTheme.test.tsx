import { act, renderHook } from '@testing-library/react';
import { Theme } from '@/shared/const/theme';
import { LOCALSTORAGE_THEME_KEY } from '@/shared/const/localstorage';
import { ThemeProvider } from '@/app/providers/ThemeProvider';
import { useTheme } from './useTheme';

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.removeAttribute('data-theme');
  });

  it('по умолчанию включает тёмную тему', () => {
    const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider });

    expect(result.current.theme).toBe(Theme.DARK);
  });

  it('переключает тему, сохраняет выбор и применяет data-theme', () => {
    const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider });

    act(() => result.current.toggleTheme());

    expect(result.current.theme).toBe(Theme.LIGHT);
    expect(localStorage.getItem(LOCALSTORAGE_THEME_KEY)).toBe(Theme.LIGHT);
    expect(document.body.getAttribute('data-theme')).toBe(Theme.LIGHT);
  });
});
