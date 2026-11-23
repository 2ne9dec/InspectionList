import { useEffect, useState } from 'react';
import type { RefObject } from 'react';

interface UseInfiniteScrollOptions {
  /** Всего элементов. */
  total: number;
  /** Сколько показывать изначально. */
  initial: number;
  /** Сколько добавлять за раз. */
  step: number;
  /** Контейнер со скроллом (null — скролл viewport). */
  rootRef?: RefObject<HTMLElement | null>;
  /** Элемент-сентинель в конце списка. */
  sentinelRef: RefObject<HTMLElement | null>;
  /** При изменении сбрасывает счётчик на initial. */
  resetKey?: string;
  /** true — наблюдать viewport (мобильный нативный скролл). */
  useViewport?: boolean;
}

/**
 * IntersectionObserver-пагинация для длинных списков.
 * Отдельно от данных: компонент решает, что считать «элементом».
 */
export function useInfiniteScroll({
  total,
  initial,
  step,
  rootRef,
  sentinelRef,
  resetKey,
  useViewport = false,
}: UseInfiniteScrollOptions) {
  const [visibleCount, setVisibleCount] = useState(initial);

  useEffect(() => {
    setVisibleCount(initial);
  }, [initial, resetKey]);

  const hasMore = visibleCount < total;

  useEffect(() => {
    const sentinel = sentinelRef.current;
    const root = useViewport ? null : rootRef?.current;
    if (!sentinel || !hasMore) return;
    if (!useViewport && !root) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + step, total));
        }
      },
      { root, threshold: 0 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, rootRef, sentinelRef, step, total, useViewport]);

  return { visibleCount, hasMore, setVisibleCount };
}
