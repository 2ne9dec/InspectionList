import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useIsMobile } from './useIsMobile';

const MOBILE_QUERY = '(max-width: 479px)';

function stubMatchMedia(matches: boolean) {
  const matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));

  vi.stubGlobal('matchMedia', matchMedia);
  return matchMedia;
}

describe('useIsMobile', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('возвращает true для мобильного viewport', () => {
    stubMatchMedia(true);

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(true);
  });

  it('возвращает false для десктопного viewport', () => {
    stubMatchMedia(false);

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(false);
  });

  it('проверяет mobile-медиазапрос', () => {
    const matchMedia = stubMatchMedia(false);

    renderHook(() => useIsMobile());

    expect(matchMedia).toHaveBeenCalledWith(MOBILE_QUERY);
  });

  it('вычисляет значение один раз при монтировании', () => {
    stubMatchMedia(true);
    const { result, rerender } = renderHook(() => useIsMobile());

    stubMatchMedia(false);
    rerender();

    expect(result.current).toBe(true);
  });
});
