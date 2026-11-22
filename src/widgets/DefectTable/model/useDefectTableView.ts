import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DefectRecordFull } from '@/entities/DefectRecord';
import { useInfiniteScroll, useIsMobile } from '@/shared/lib/hooks';

const INITIAL_POLES = 50;
const LOAD_MORE_POLES = 50;

interface UseDefectTableViewParams {
  /** Все группы «место → дефекты», уже отфильтрованные и отсортированные. */
  groupedByPole: Array<[string, DefectRecordFull[]]>;
  /** Ключ фильтров: при изменении сбрасываются раскрытие и пагинация. */
  filtersKey: string;
  onFix: (locationKey: string) => void;
}

/**
 * Представление таблицы дефектов: раскрытие опор, порционная отрисовка
 * и переход к устранению по id дефекта.
 */
export function useDefectTableView({
  groupedByPole,
  filtersKey,
  onFix,
}: UseDefectTableViewParams) {
  const [expandedPoles, setExpandedPoles] = useState<Set<string>>(new Set());

  const handleToggleExpand = useCallback((key: string) => {
    setExpandedPoles((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const resetExpanded = useCallback(() => setExpandedPoles(new Set()), []);

  const tableWrapperRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // На телефоне (< 480px) страница скроллит нативно — root должен быть null (viewport)
  const isMobilePhone = useIsMobile();

  useEffect(() => {
    resetExpanded();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey]);

  const {
    visibleCount: displayCount,
    hasMore,
    setVisibleCount: setDisplayCount,
  } = useInfiniteScroll({
    total: groupedByPole.length,
    initial: INITIAL_POLES,
    step: LOAD_MORE_POLES,
    rootRef: tableWrapperRef,
    sentinelRef,
    resetKey: filtersKey,
    useViewport: isMobilePhone,
  });

  const visibleGroups = groupedByPole.slice(0, displayCount);

  // Авто-расширение displayCount: если появился новый ряд опоры за пределами окна — включаем её
  const prevGroupCountRef = useRef(groupedByPole.length);
  useEffect(() => {
    const curr = groupedByPole.length;
    if (curr > prevGroupCountRef.current && curr > displayCount) {
      setDisplayCount(curr);
    }
    prevGroupCountRef.current = curr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupedByPole.length]);

  const anyExpanded = expandedPoles.size > 0;

  // Map<defectId → locationKey> — O(1) lookup вместо flatMap + find при каждом клике
  const defectPoleMap = useMemo(() => {
    const map = new Map<number, string>();
    for (const [locationKey, recs] of groupedByPole) {
      for (const r of recs) map.set(r.id, locationKey);
    }
    return map;
  }, [groupedByPole]);

  const handleFixOne = useCallback((defectId: number) => {
    const key = defectPoleMap.get(defectId);
    if (key != null) onFix(key);
  }, [defectPoleMap, onFix]);

  return {
    tableWrapperRef,
    sentinelRef,
    expandedPoles,
    handleToggleExpand,
    resetExpanded,
    anyExpanded,
    visibleGroups,
    hasMore,
    handleFixOne,
  };
}
