import { memo, useRef, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { classNames } from '@/shared/lib/classNames/classNames';
import { useEscape, useFloatingPosition, useOutsideClick } from '@/shared/lib/hooks';
import type { FloatingPosition } from '@/shared/lib/hooks';
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

  const pos: FloatingPosition = useFloatingPosition(triggerRef, { isOpen: open, placement });

  const panelStyle: React.CSSProperties = { top: pos.top, width: panelWidth };
  if (pos.right !== undefined) panelStyle.right = pos.right;
  if (pos.left !== undefined) panelStyle.left = pos.left;

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
            style={panelStyle}
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
