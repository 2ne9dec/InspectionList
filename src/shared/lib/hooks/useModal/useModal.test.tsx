import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useModal } from './useModal';

describe('useModal', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('не монтирует содержимое, пока модалка не открыта', () => {
    const onClose = vi.fn();
    const { result } = renderHook(() =>
      useModal({ animationDelay: 300, isOpen: false, onClose }),
    );

    expect(result.current.isMounted).toBe(false);
    expect(result.current.isClosing).toBe(false);
  });

  it('монтирует содержимое при открытии', () => {
    const onClose = vi.fn();
    const { result, rerender } = renderHook(
      ({ isOpen }) => useModal({ animationDelay: 300, isOpen, onClose }),
      { initialProps: { isOpen: false } },
    );

    rerender({ isOpen: true });

    expect(result.current.isMounted).toBe(true);
  });

  it('остаётся смонтированной после закрытия (для анимации)', () => {
    const onClose = vi.fn();
    const { result, rerender } = renderHook(
      ({ isOpen }) => useModal({ animationDelay: 300, isOpen, onClose }),
      { initialProps: { isOpen: false } },
    );

    rerender({ isOpen: true });
    rerender({ isOpen: false });

    expect(result.current.isMounted).toBe(true);
  });

  it('вызывает onClose только после задержки анимации', () => {
    const onClose = vi.fn();
    const { result } = renderHook(() =>
      useModal({ animationDelay: 300, isOpen: true, onClose }),
    );

    act(() => result.current.close());

    expect(result.current.isClosing).toBe(true);
    expect(onClose).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(onClose).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(result.current.isClosing).toBe(false);
  });

  it('ничего не делает, если onClose не передан', () => {
    const { result } = renderHook(() =>
      useModal({ animationDelay: 300, isOpen: true }),
    );

    act(() => result.current.close());
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.isClosing).toBe(false);
  });

  it('не вызывает onClose после размонтирования', () => {
    const onClose = vi.fn();
    const { result, unmount } = renderHook(() =>
      useModal({ animationDelay: 300, isOpen: true, onClose }),
    );

    act(() => result.current.close());
    unmount();
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(onClose).not.toHaveBeenCalled();
  });
});
