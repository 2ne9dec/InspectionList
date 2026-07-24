import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PoleGroupRow } from '@/entities/DefectRecord';
import type { DefectRecordFull } from '@/entities/DefectRecord';
import { ConfirmModal, EmptyState, Loader } from '@/shared/ui';
import { useDefectTable } from '../model/useDefectTable';
import { DefectTableHeader } from './DefectTableHeader';
import { DefectTableToolbar } from './DefectTableToolbar';
import { useIsMobile } from '@/shared/lib/hooks';
import cls from './DefectTable.module.scss';

interface DefectTableProps {
  sheetId: number;
  onRowClick?: (defect: DefectRecordFull) => void;
  /** Открыть модал устранения для locationKey */
  onFix: (locationKey: string) => void;
  /** Открыть модал копирования для locationKey */
  onCopy: (locationKey: string) => void;
}

const INITIAL_POLES = 50;
const LOAD_MORE_POLES = 50;

/**
 * Виджет таблицы дефектов листка осмотра.
 *
 * Infinite scroll: данные загружаются целиком (RTK Query кэш), в DOM
 * рендерятся только видимые опоры. Сентинель — div ПОСЛЕ таблицы
 * (не внутри tbody), чтобы не нарушать table-layout: fixed.
 */
export const DefectTable = memo(({ sheetId, onRowClick, onFix, onCopy }: DefectTableProps) => {
  const {
    isLoading,
    groupedByPole,
    elementOptions,
    defectTypeOptions,
    activeCount,
    fixedCount,
    hasFilters,
    tab,
    setTab,
    search,
    setSearch,
    filterElementId,
    filterDefectTypeId,
    sortDir,
    toggleSort,
    clearFilters,
    handleElementChange,
    setFilterDefectTypeId,
    handleDelete,
    handleDeleteAll,
    confirmProps,
  } = useDefectTable(sheetId);

  const [expandedPoles, setExpandedPoles] = useState<Set<string>>(new Set());
  const handleToggleExpand = useCallback((key: string) => {
    setExpandedPoles((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // ── Infinite scroll ──────────────────────────────────────────────────────────────────────────
  const [displayCount, setDisplayCount] = useState(INITIAL_POLES);
  const tableWrapperRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // На телефоне (< 480px) страница скроллит нативно — root должен быть null (viewport)
  const isMobilePhone = useIsMobile();

  const filtersKey = [tab, search, filterElementId, filterDefectTypeId, sortDir].join('|');
  useEffect(() => {
    setDisplayCount(INITIAL_POLES);
    setExpandedPoles(new Set());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey]);

  const visibleGroups = groupedByPole.slice(0, displayCount);
  const hasMore = displayCount < groupedByPole.length;

  useEffect(() => {
    const sentinel = sentinelRef.current;
    const wrapper = tableWrapperRef.current;
    if (!sentinel || !hasMore) return;
    if (!isMobilePhone && !wrapper) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setDisplayCount((prev) => prev + LOAD_MORE_POLES); },
      { root: isMobilePhone ? null : wrapper, threshold: 0 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isMobilePhone]);
  // ────────────────────────────────────────────────────────────────────────────

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

  const isFixedTab = tab === 'fixed';
  const anyExpanded = expandedPoles.size > 0;

  const handleTabChange = useCallback((t: typeof tab) => {
    setExpandedPoles(new Set());
    setTab(t);
  }, [setTab]);

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

  return (
    <div className={cls.wrapper}>
      <DefectTableToolbar
        tab={tab}
        onTabChange={handleTabChange}
        activeCount={activeCount}
        fixedCount={fixedCount}
        search={search}
        onSearchChange={setSearch}
        hasFilters={hasFilters}
        onClearFilters={clearFilters}
      />
      <div className={cls.tableWrapper} ref={tableWrapperRef} data-defect-table-wrap>
        {isLoading ? (
          <div className={cls.center}><Loader /></div>
        ) : groupedByPole.length === 0 ? (
          <EmptyState
            compact
            title={
              hasFilters
                ? 'Ничего не найдено'
                : isFixedTab
                  ? 'Нет устранённых дефектов'
                  : 'Нет активных дефектов'
            }
          />
        ) : (
          <>
            <table className={cls.table}>
              <DefectTableHeader
                sortDir={sortDir}
                onSortToggle={toggleSort}
                anyExpanded={anyExpanded}
                isFixed={isFixedTab}
                filterElementId={filterElementId}
                filterDefectTypeId={filterDefectTypeId}
                    elements={elementOptions}
                defectTypes={defectTypeOptions}
                    onElementChange={handleElementChange}
                onDefectTypeChange={setFilterDefectTypeId}
                  />
              <tbody>
                {(() => {
                  let defectOffset = 0;
                  return visibleGroups.map(([locationKey, records], idx) => {
                    const startIdx = defectOffset;
                    defectOffset += records.length;
                    return (
                  <PoleGroupRow
                    key={locationKey}
                    locationKey={locationKey}
                    index={idx + 1}
                    defectStartIndex={startIdx}
                    records={records}
                    isExpanded={expandedPoles.has(locationKey)}
                    anyExpanded={anyExpanded}
                    isFixed={isFixedTab}
                    onToggle={handleToggleExpand}
                    onFix={onFix}
                    onFixOne={handleFixOne}
                    onCopy={onCopy}
                    onDelete={handleDelete}
                    onDeleteAll={handleDeleteAll}
                    onRowClick={onRowClick}
                  />
                    );
                  });
                })()}
              </tbody>
            </table>
            {hasMore && (
              <div ref={sentinelRef} className={cls.sentinel}>
                <Loader />
              </div>
            )}
          </>
        )}
      </div>
      <ConfirmModal {...confirmProps} />
    </div>
  );
});

DefectTable.displayName = 'DefectTable';
