import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePermissions } from '@/entities/User';
import { ConfirmModal, EmptyState, Loader } from '@/shared/ui';
import { useInfiniteScroll } from '@/shared/lib/hooks';
import { useSheetsList } from '../model/useSheetsList';
import { useSheetMerge } from '../model/useSheetMerge';
import { useSheetEdit } from '../model/useSheetEdit';
import { useSheetClone } from '../model/useSheetClone';
import { useSheetActions } from '../model/useSheetActions';
import { SheetsTable } from './SheetsTable';
import { SheetsListFilterBar } from './SheetsListFilterBar';
import { CloneSheetModal } from './CloneSheetModal';
import { EditSheetModal } from './EditSheetModal';
import { MergeSheetModal } from './MergeSheetModal';
import cls from './SheetsList.module.scss';

const INITIAL_SHEETS   = 30;
const LOAD_MORE_SHEETS = 30;

/** Первый день текущего месяца в формате YYYY-MM-DD */
function getDefaultDateFrom(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

export const SheetsList = memo(() => {
  const navigate = useNavigate();

  // По умолчанию показываем листки с начала текущего месяца
  const [dateFrom, setDateFrom] = useState(getDefaultDateFrom);
  const [dateTo,   setDateTo]   = useState('');
  const hasDateFilter = !!(dateFrom || dateTo);

  // Действия с листками — по правам роли (задаёт администратор)
  const { can } = usePermissions();
  const isReadOnly = !can('sheets.create');

  const { sheets, isLoading, deleteSheet, hasSearch, sortKey, sortDir, toggleSort } =
    useSheetsList({ dateFrom, dateTo, statusFilter: 'all' });

  // ── Infinite scroll ─────────────────────────────────────────────────────────────────────────────
  const tableWrapperRef = useRef<HTMLDivElement>(null);
  const sentinelRef     = useRef<HTMLDivElement>(null);

  const filtersKey = [hasSearch, dateFrom, dateTo, sortKey, sortDir].join('|');
  const { visibleCount: displayCount, hasMore } = useInfiniteScroll({
    total: sheets.length,
    initial: INITIAL_SHEETS,
    step: LOAD_MORE_SHEETS,
    rootRef: tableWrapperRef,
    sentinelRef,
    resetKey: filtersKey,
  });

  const visibleSheets = sheets.slice(0, displayCount);

  const firstSheetId = sheets[0]?.id;
  useEffect(() => {
    if (firstSheetId != null) {
      tableWrapperRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [firstSheetId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Операции с листками ───────────────────────────────────────────────────────────────────────────
  const merge = useSheetMerge(sheets);
  const edit  = useSheetEdit(sheets);
  const clone = useSheetClone(sheets);

  const deleteSheetById = useCallback(
    (id: number) => deleteSheet(id).unwrap(),
    [deleteSheet],
  );

  const { handleOpen, handleDelete, handleClone, handleEdit } = useSheetActions({
    navigate,
    canCreate: can('sheets.create'),
    canEdit: can('sheets.edit'),
    canDelete: can('sheets.delete'),
    deleteSheet: deleteSheetById,
    merge,
    clone,
    edit,
  });

  const handleDateRangeChange = useCallback(
    ({ from, to }: { from: string; to: string }) => { setDateFrom(from); setDateTo(to); },
    [],
  );

  return (
    <div className={cls.wrapper}>
      <SheetsListFilterBar
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateRangeChange={handleDateRangeChange}
        mergeCount={merge.selectedIds.size}
        mergeLineName={merge.mergeLineName}
        onOpenMerge={merge.handleOpenMerge}
      />

      <div className={cls.tableWrapper} ref={tableWrapperRef}>
        {isLoading ? (
          <div className={cls.center}><Loader /></div>
        ) : sheets.length === 0 ? (
          <EmptyState
            title={hasSearch || hasDateFilter ? 'Ничего не найдено' : 'Нет листков осмотра'}
            description={hasSearch || hasDateFilter
              ? 'Попробуйте изменить параметры фильтрации.'
              : isReadOnly ? 'Листки осмотра появятся после их создания в филиалах.'
                : 'Создайте первый листок осмотра, чтобы начать работу.'}
          />
        ) : (
          <>
            <SheetsTable
              sheets={visibleSheets}
              showFilial={false}
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={toggleSort}
              onOpen={handleOpen}
              onDelete={handleDelete}
              canDeleteServer={can('sheets.delete')}
              onClone={can('sheets.create') ? handleClone : undefined}
              onEdit={can('sheets.edit') ? handleEdit : undefined}
              selectedIds={merge.selectedIds}
              onSelect={can('sheets.merge') ? merge.handleSelect : undefined}
              mergeLineId={merge.mergeLineId}
            />
            {hasMore && <div ref={sentinelRef} className={cls.sentinel}><Loader /></div>}
          </>
        )}
      </div>

      {edit.editTargetId !== null && (
        <EditSheetModal
          isOpen
          date={edit.editDate}
          createdBy={edit.editBy}
          updating={edit.updating}
          onDateChange={edit.setEditDate}
          onCreatedByChange={edit.setEditBy}
          onClose={edit.handleCloseEdit}
          onSave={edit.handleSaveEdit}
        />
      )}

      <CloneSheetModal
        isOpen={!!clone.cloneTargetId}
        target={clone.cloneTarget}
        date={clone.cloneDate}
        createdBy={clone.cloneBy}
        loading={clone.cloning}
        onDateChange={clone.setCloneDate}
        onCreatedByChange={clone.setCloneBy}
        onClose={clone.handleCloseClone}
        onConfirm={clone.handleClone}
      />

      <MergeSheetModal
        isOpen={merge.mergeOpen}
        selectedSheets={merge.selectedSheets}
        date={merge.mergeDate}
        createdBy={merge.mergeBy}
        loading={merge.merging}
        onDateChange={merge.setMergeDate}
        onCreatedByChange={merge.setMergeBy}
        onClose={merge.handleCloseMerge}
        onConfirm={merge.handleMerge}
      />

      <ConfirmModal {...merge.mergeConfirmProps} />
    </div>
  );
});

SheetsList.displayName = 'SheetsList';
