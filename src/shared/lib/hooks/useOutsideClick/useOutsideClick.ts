import { useEffect } from 'react';
import type { RefObject } from 'react';

interface UseOutsideClickOptions {
  /** Хук активен только когда true (например, попап открыт). */
  enabled?: boolean;
  /** Какие события слушать. mousedown — снимает race с onClick кнопки-триггера. */
  event?: 'mousedown' | 'click';
}

/**
 * Закрывает попап/меню при клике вне набора отслеживаемых элементов.
 * Принимает массив refs — удобно когда у попапа несколько фрагментов (триггер + панель).
 *
 * @example
 * const triggerRef = useRef(null);
 * const popupRef = useRef(null);
 * useOutsideClick([triggerRef, popupRef], () => setOpen(false), { enabled: open });
 */
export function useOutsideClick<T extends HTMLElement = HTMLElement>(
  refs: RefObject<T | null> | Array<RefObject<T | null>>,
  handler: (event: MouseEvent) => void,
  options: UseOutsideClickOptions = {},
): void {
  const { enabled = true, event = 'mousedown' } = options;

  useEffect(() => {
    if (!enabled) return;

    const refList = Array.isArray(refs) ? refs : [refs];

    const listener = (e: MouseEvent) => {
      const target = e.target as Node;
      const isInside = refList.some((r) => r.current && r.current.contains(target));
      if (!isInside) handler(e);
    };

    document.addEventListener(event, listener);
    return () => document.removeEventListener(event, listener);
  }, [refs, handler, enabled, event]);
}
