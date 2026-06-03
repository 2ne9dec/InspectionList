import { useEffect } from 'react';

interface UseEscapeOptions {
  enabled?: boolean;
}

/**
 * Вызывает handler при нажатии Escape.
 * Один глобальный listener — без дублирования по всем модалкам/попапам.
 */
export function useEscape(handler: () => void, options: UseEscapeOptions = {}): void {
  const { enabled = true } = options;

  useEffect(() => {
    if (!enabled) return;

    const listener = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handler();
    };

    document.addEventListener('keydown', listener);
    return () => document.removeEventListener('keydown', listener);
  }, [handler, enabled]);
}
