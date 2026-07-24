import { memo, useRef, useState, useCallback, useEffect, useLayoutEffect } from 'react';
import type { ReactNode } from 'react';
import { classNames } from '@/shared/lib/classNames/classNames';
import { useEscape, useOutsideClick } from '@/shared/lib/hooks';
import { Portal } from '../Portal';
import cls from './Dropdown.module.scss';

export interface DropdownProps {
  /** Триггер: получает onClick и aria-expanded. */
  trigger: (api: { open: boolean; toggle: () => void; close: () => void }) => ReactNode;
  /** Содержимое: получает API для закрытия. */
  children: (api: { close: () => void }) => ReactNode;
  /** Куда выравнивать. */
  placement?: 'bottom-start' | 'bottom-end';
  /** Класс для контейнера дропдауна. */
  panelClassName?: string;
  /** Ширина панели (по-умолчанию по контенту). */
  panelWidth?: number | string;
  /** Класс для обёртки триггера (triggerWrap). */
  wrapperClassName?: string;
}

/**
 * Универсальный dropdown с порталом, позиционированием и закрытием по клику вне/Esc.
 */
export const Dropdown = memo((props: DropdownProps) => {
  const { trigger, children, placement = 'bottom-start', panelClassName, panelWidth, wrapperClassName } = props;

  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((p) => !p), []);

  useOutsideClick([triggerRef, panelRef], close, { enabled: open });
  useEscape(close, { enabled: open });

  const applyPosition = useCallback(() => {
    if (!panelRef.current || !triggerRef.current) return;
    const panel = panelRef.current;
    const tr = triggerRef.current.getBoundingClientRect();
    const width = panelWidth
      ? (typeof panelWidth === 'number' ? `${panelWidth}px` : panelWidth)
      : undefined;
    if (width) panel.style.width = width;

    if (placement === 'bottom-end') {
      panel.style.right = `${window.innerWidth - tr.right}px`;
      panel.style.left  = 'auto';
    } else {
      panel.style.left  = `${tr.left}px`;
      panel.style.right = 'auto';
    }
    // Всегда открываем вниз, ограничиваем доступным пространством
    const spaceBelow = window.innerHeight - tr.bottom - 8;
    const spaceAbove = tr.top - 8;
    if (spaceBelow < 100 && spaceAbove > spaceBelow) {
      // Открываем вверх: нижний край панели прибит к верху кнопки
      panel.style.top = 'auto';
      panel.style.bottom = `${window.innerHeight - tr.top + 4}px`;
      panel.style.maxHeight = `${Math.min(spaceAbove, 360)}px`;
    } else {
      panel.style.bottom = 'auto';
      panel.style.top = `${tr.bottom + 4}px`;
      panel.style.maxHeight = `${Math.min(spaceBelow, 360)}px`;
    }
    panel.style.visibility = 'visible';
  }, [placement, panelWidth]);

  useLayoutEffect(() => {
    if (!open) return;
    applyPosition();
  }, [open, applyPosition]);

  useEffect(() => {
    if (!open) return;
    window.addEventListener('resize', applyPosition);
    window.addEventListener('scroll', applyPosition, true);
    return () => {
      window.removeEventListener('resize', applyPosition);
      window.removeEventListener('scroll', applyPosition, true);
    };
  }, [open, applyPosition]);

  return (
    <>
      <div ref={triggerRef} className={classNames(cls.triggerWrap, {}, [wrapperClassName])}>
        {trigger({ open, toggle, close })}
      </div>
      {open && (
        <Portal>
          <div
            ref={panelRef}
            className={classNames(cls.panel, {}, [panelClassName])}
            style={{ visibility: 'hidden' }}
            role="menu"
          >
            {children({ close })}
          </div>
        </Portal>
      )}
    </>
  );
});

Dropdown.displayName = 'Dropdown';
