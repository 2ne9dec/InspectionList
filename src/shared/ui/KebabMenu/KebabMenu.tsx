import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode, RefObject } from 'react';
import { classNames } from '@/shared/lib/classNames/classNames';
import { useEscape, useOutsideClick } from '@/shared/lib/hooks';
import { Portal } from '../Portal';
import cls from './KebabMenu.module.scss';

export interface KebabMenuItem {
  /** Уникальный id (для key). */
  id: string;
  /** Подпись пункта. */
  label: ReactNode;
  /** Иконка слева (опц.). */
  icon?: ReactNode;
  /** Опасное действие — красная подсветка (Удалить). */
  danger?: boolean;
  /** Отключённый пункт. */
  disabled?: boolean;
  /** Колбэк по клику. */
  onClick: () => void;
}

export interface KebabMenuProps {
  items: KebabMenuItem[];
  /** Подпись для скринридера (aria-label). */
  ariaLabel?: string;
  /** Класс на корневом контейнере. */
  className?: string;
  /** Размер кнопки. По-умолчанию m. */
  size?: 's' | 'm';
}

/**
 * Меню «три точки» — иконка ⋮ + выпадающий список пунктов.
 * Реализовано через Portal + useFloatingPosition, поэтому работает внутри
 * таблиц с overflow: hidden и не «прячется» за границей контейнера.
 */
export const KebabMenu = memo((props: KebabMenuProps) => {
  const { items, ariaLabel = 'Действия', className, size = 'm' } = props;

  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  // refs разного типа (button + div). Чтобы TS не залип на первом элементе,
  // явно типизируем массив через общий супер-тип HTMLElement.
  const outsideRefs = useMemo<Array<RefObject<HTMLElement | null>>>(
    () => [btnRef, panelRef],
    [],
  );
  useOutsideClick(outsideRefs, close, { enabled: open });
  useEscape(close, { enabled: open });

  /**
   * Позиционирование + flip — всё в одном useLayoutEffect, без state.
   *
   * Проблема state-based подхода: setPos() внутри useLayoutEffect ставит обновление
   * в очередь и обрабатывает его ПОСЛЕ всех текущих эффектов. Поэтому к моменту
   * flip-проверки панель всё ещё на top:0 — flip не срабатывает.
   *
   * Решение: рендерим панель с visibility:hidden, применяем реальную позицию и flip
   * напрямую через DOM в одном эффекте, затем делаем visible. Браузер рисует сразу
   * в правильном месте — без промежуточных состояний.
   */
  useLayoutEffect(() => {
    if (!open || !panelRef.current || !btnRef.current) return;
    const panel = panelRef.current;
    const btn   = btnRef.current.getBoundingClientRect();

    // Начальная позиция: правый край панели = правый край кнопки, ниже кнопки.
    panel.style.top   = `${btn.bottom + 4}px`;
    panel.style.right = `${window.innerWidth - btn.right}px`;
    panel.style.left  = 'auto';

    // Flip: не помещается снизу — открываем выше.
    const pr = panel.getBoundingClientRect();
    if (pr.bottom > window.innerHeight) {
      panel.style.top = `${Math.max(btn.top - pr.height - 4, 4)}px`;
    }

    panel.style.visibility = 'visible';
  }, [open]);

  // Обновляем позицию при скролле/ресайзе пока меню открыто.
  useEffect(() => {
    if (!open) return;
    const update = () => {
      if (!panelRef.current || !btnRef.current) return;
      const panel = panelRef.current;
      const btn   = btnRef.current.getBoundingClientRect();
      panel.style.top   = `${btn.bottom + 4}px`;
      panel.style.right = `${window.innerWidth - btn.right}px`;
      panel.style.left  = 'auto';
      const pr = panel.getBoundingClientRect();
      if (pr.bottom > window.innerHeight) {
        panel.style.top = `${Math.max(btn.top - pr.height - 4, 4)}px`;
      }
    };
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open]);

  const handleItem = (item: KebabMenuItem) => {
    if (item.disabled) return;
    setOpen(false);
    item.onClick();
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={classNames(cls.btn, { [cls.sizeS]: size === 's' }, [className])}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((p) => !p);
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={ariaLabel}
      >
        <span className={cls.dots} aria-hidden>⋮</span>
      </button>
      {open && (
        <Portal>
          <div
            ref={panelRef}
            className={cls.panel}
            role="menu"
            style={{ visibility: 'hidden' }}
          >
            {items.map((it) => (
              <button
                key={it.id}
                type="button"
                role="menuitem"
                disabled={it.disabled}
                className={classNames(cls.item, {
                  [cls.itemDanger]: !!it.danger,
                  [cls.itemDisabled]: !!it.disabled,
                })}
                onClick={(e) => {
                  e.stopPropagation();
                  handleItem(it);
                }}
              >
                {it.icon && <span className={cls.icon}>{it.icon}</span>}
                <span className={cls.label}>{it.label}</span>
              </button>
            ))}
          </div>
        </Portal>
      )}
    </>
  );
});

KebabMenu.displayName = 'KebabMenu';
