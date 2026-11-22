import { memo, useCallback } from 'react';
import type { DefectRecordFull } from '@/entities/DefectRecord';
import { ConfirmModal, EmptyState, Loader, Table } from '@/shared/ui';
import { useDefectTable } from '../model/useDefectTable';
import { useDefectTableView } from '../model/useDefectTableView';
import { DefectTableBody } from './DefectTableBody';
import { DefectTableHeader } from './DefectTableHeader';
import { DefectTableToolbar } from './DefectTableToolbar';
import cls from './DefectTable.module.scss';

interface DefectTableProps {
  sheetId: number;
  onRowClick?: (defect: DefectRecordFull) => void;
  /** Открыть модал устранения для locationKey */
  onFix: (locationKey: string) => void;
  /** Открыть модал копирования для locationKey */
  onCopy: (locationKey: string) => void;
  /** Исправить ошибочно внесённый дефект */
  onEdit?: (defect: DefectRecordFull) => void;
  canEdit?: boolean;
  /** Доступные действия по правам роли */
  canFix?: boolean;
  canCopy?: boolean;
  canDelete?: boolean;
}

/**
 * Виджет таблицы дефектов листка осмотра.
 *
 * Infinite scroll: данные загружаются целиком (RTK Query кэш), в DOM
 * рендерятся только видимые опоры. Сентинель — div ПОСЛЕ таблицы
 * (не внутри tbody), чтобы не нарушать table-layout: fixed.
 */
export const DefectTable = memo(({ sheetId, onRowClick, onFix, onCopy, onEdit, canFix = true, canCopy = true, canDelete = true, canEdit = false }: DefectTableProps) => {
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

  const filtersKey = [tab, search, filterElementId, filterDefectTypeId, sortDir].join('|');

  const {
    tableWrapperRef,
    sentinelRef,
    expandedPoles,
    handleToggleExpand,
    resetExpanded,
    anyExpanded,
    visibleGroups,
    hasMore,
    handleFixOne,
  } = useDefectTableView({ groupedByPole, filtersKey, onFix });

  const isFixedTab = tab === 'fixed';

  const handleTabChange = useCallback((t: typeof tab) => {
    resetExpanded();
    setTab(t);
  }, [resetExpanded, setTab]);

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
            <Table className={cls.table}>
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
              <DefectTableBody
                groups={visibleGroups}
                expandedPoles={expandedPoles}
                anyExpanded={anyExpanded}
                isFixed={isFixedTab}
                onToggle={handleToggleExpand}
                onFix={onFix}
                onFixOne={handleFixOne}
                onCopy={onCopy}
                onDelete={handleDelete}
                onDeleteAll={handleDeleteAll}
                onEdit={onEdit}
                onRowClick={onRowClick}
                canFix={canFix}
                canCopy={canCopy}
                canDelete={canDelete}
                canEdit={canEdit}
              />
            </Table>
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
