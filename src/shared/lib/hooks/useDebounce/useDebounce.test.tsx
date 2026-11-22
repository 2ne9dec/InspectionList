import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDebounce } from './useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('вызывает колбэк один раз после задержки', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDebounce(callback, 300));

    act(() => result.current('опора'));
    expect(callback).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(callback).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('опора');
  });

  it('перезапускает таймер и использует последние аргументы', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDebounce(callback, 300));

    act(() => result.current('первый'));
    act(() => {
      vi.advanceTimersByTime(200);
    });
    act(() => result.current('второй'));
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith('второй');
  });

  it('передаёт все аргументы вызова', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useDebounce(callback, 100));

    act(() => result.current(1, 'два', true));
    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(callback).toHaveBeenCalledWith(1, 'два', true);
  });

  it('вызывает актуальный колбэк после ререндера', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { result, rerender } = renderHook(
      ({ callback }) => useDebounce(callback, 100),
      { initialProps: { callback: first } },
    );

    rerender({ callback: second });
    act(() => result.current('значение'));
    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith('значение');
  });

  it('отменяет запланированный вызов при размонтировании', () => {
    const callback = vi.fn();
    const { result, unmount } = renderHook(() => useDebounce(callback, 200));

    act(() => result.current('значение'));
    unmount();
    act(() => {
      vi.advanceTimersByTime(200);
    });

    expect(callback).not.toHaveBeenCalled();
  });

  it('не вызывает колбэк без вызова обёртки', () => {
    const callback = vi.fn();
    renderHook(() => useDebounce(callback, 50));

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(callback).not.toHaveBeenCalled();
  });
});
