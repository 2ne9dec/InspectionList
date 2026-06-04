import { useEffect } from 'react';

interface Handlers {
  onFocusAdd: () => void;
  onToggleTimeline: () => void;
}

/**
 * Глобальные горячие клавиши на странице листка осмотра.
 * Alt+N — фокус на поле "Опора"
 * Alt+T — открыть/закрыть ленту событий
 */
export function useSheetKeyboard({ onFocusAdd, onToggleTimeline }: Handlers) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.altKey && e.code === 'KeyN') {
        e.preventDefault();
        onFocusAdd();
      }
      if (e.altKey && e.code === 'KeyT') {
        e.preventDefault();
        onToggleTimeline();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onFocusAdd, onToggleTimeline]);
}
