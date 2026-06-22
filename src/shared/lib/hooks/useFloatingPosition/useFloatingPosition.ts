import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import type { RefObject } from 'react';

export interface FloatingPosition {
  top: number;
  /** Координата left относительно viewport. */
  left?: number;
  /** Координата right относительно viewport (для выравнивания по правому краю). */
  right?: number;
}

interface UseFloatingPositionOptions {
  /** Открыт ли overlay — пересчёт делается только при открытии и при ресайзе. */
  isOpen: boolean;
  /** Стратегия выравнивания. */
  placement?: 'bottom-start' | 'bottom-end';
  /** Отступ между триггером и плавающим элементом. */
  offset?: number;
}

/**
 * Вычисляет позицию плавающего элемента (поповер/меню) относительно триггера.
 * Заменяет повторяющуюся ручную математику с getBoundingClientRect.
 *
 * Для placement='bottom-start' возвращает {top, left}.
 * Для placement='bottom-end' возвращает {top, right} (left = undefined),
 * чтобы position:fixed не растягивался от left до right.
 */
export function useFloatingPosition<T extends HTMLElement>(
  triggerRef: RefObject<T | null>,
  { isOpen, placement = 'bottom-start', offset = 4 }: UseFloatingPositionOptions,
): FloatingPosition {
  const [pos, setPos] = useState<FloatingPosition>({ top: 0, left: 0 });

  const update = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    if (placement === 'bottom-end') {
      // Прижимаем правый край панели к правому краю триггера.
      setPos({ top: rect.bottom + offset, right: window.innerWidth - rect.right });
    } else {
      setPos({ top: rect.bottom + offset, left: rect.left });
    }
  }, [triggerRef, placement, offset]);

  // useLayoutEffect (не useEffect) — позиция считается синхронно до первого paint,
  // иначе flip-логика в компонентах не успевает сработать при первом открытии.
  useLayoutEffect(() => {
    if (!isOpen) return;
    update();
  }, [isOpen, update]);

  // Scroll/resize слушаются через обычный useEffect — они не влияют на первый рендер.
  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [isOpen, update]);

  return pos;
}
