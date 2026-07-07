import { useEffect } from 'react';

interface UseEscapeOptions {
  enabled?: boolean;
  /**
   * Blur the active element after handler runs.
   * Prevents :focus-visible ring appearing on the trigger button
   * after a popup/modal closes via ESC.
   * Set to false where focus should stay (e.g. Combobox).
   */
  blurOnClose?: boolean;
}

/**
 * Calls handler on Escape keydown.
 * Single global listener — no duplication across popups/modals.
 */
export function useEscape(handler: () => void, options: UseEscapeOptions = {}): void {
  const { enabled = true, blurOnClose = false } = options;

  useEffect(() => {
    if (!enabled) return;

    const listener = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handler();
        if (blurOnClose) {
          requestAnimationFrame(() => (document.activeElement as HTMLElement)?.blur());
        }
      }
    };

    document.addEventListener('keydown', listener);
    return () => document.removeEventListener('keydown', listener);
  }, [handler, enabled, blurOnClose]);
}
