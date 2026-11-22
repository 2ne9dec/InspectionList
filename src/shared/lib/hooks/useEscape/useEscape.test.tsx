import { fireEvent, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useEscape } from './useEscape';

describe('useEscape', () => {
  it('вызывает обработчик по нажатию Escape', () => {
    const handler = vi.fn();
    renderHook(() => useEscape(handler));

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('игнорирует другие клавиши', () => {
    const handler = vi.fn();
    renderHook(() => useEscape(handler));

    fireEvent.keyDown(document, { key: 'Enter' });
    fireEvent.keyDown(document, { key: 'Esc' });

    expect(handler).not.toHaveBeenCalled();
  });

  it('не подписывается при enabled: false', () => {
    const handler = vi.fn();
    renderHook(() => useEscape(handler, { enabled: false }));

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(handler).not.toHaveBeenCalled();
  });

  it('начинает реагировать после включения enabled', () => {
    const handler = vi.fn();
    const { rerender } = renderHook(
      ({ enabled }) => useEscape(handler, { enabled }),
      { initialProps: { enabled: false } },
    );

    rerender({ enabled: true });
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('снимает обработчик при размонтировании', () => {
    const handler = vi.fn();
    const { unmount } = renderHook(() => useEscape(handler));

    unmount();
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(handler).not.toHaveBeenCalled();
  });

  it('использует актуальный обработчик после ререндера', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(
      ({ handler }) => useEscape(handler),
      { initialProps: { handler: first } },
    );

    rerender({ handler: second });
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});
