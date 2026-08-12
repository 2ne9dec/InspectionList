import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ConfirmModal, EmptyState, Loader, Button, Modal, Input, FormField, VStack } from '@/shared/ui';
import { getRouteSheetDetail } from '@/shared/const/router';
import { toast } from '@/shared/lib/toast';
import { logger } from '@/shared/lib/logger';
import { removePendingSheet } from '@/shared/lib/offline/pendingSheets';
import { useSheetsList } from '../model/useSheetsList';
import { useSheetMerge } from '../model/useSheetMerge';
import { useSheetEdit } from '../model/useSheetEdit';
import { useSheetClone } from '../model/useSheetClone';
import { DateRangeFilter } from './DateRangeFilter';
import { SheetsTable } from './SheetsTable';
import { CloneSheetModal } from './CloneSheetModal';
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

  const { sheets, isLoading, deleteSheet, hasSearch, sortKey, sortDir, toggleSort } =
    useSheetsList({ dateFrom, dateTo, statusFilter: 'all' });

  // ── Infinite scroll ─────────────────────────────────────────────────────────────────────────────
  const [displayCount, setDisplayCount] = useState(INITIAL_SHEETS);
  const tableWrapperRef = useRef<HTMLDivElement>(null);
  const sentinelRef     = useRef<HTMLDivElement>(null);

  const filtersKey = [hasSearch, dateFrom, dateTo, sortKey, sortDir].join('|');
  useEffect(() => { setDisplayCount(INITIAL_SHEETS); }, [filtersKey]); // eslint-disable-line

  const visibleSheets = sheets.slice(0, displayCount);
  const hasMore = displayCount < sheets.length;

  const firstSheetId = sheets[0]?.id;
  useEffect(() => {
    if (firstSheetId != null) {
      tableWrapperRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [firstSheetId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const sentinel = sentinelRef.current;
    const wrapper  = tableWrapperRef.current;
    if (!sentinel || !wrapper || !hasMore) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setDisplayCount((p) => p + LOAD_MORE_SHEETS); },
      { root: wrapper, threshold: 0 },
    );
    obs.observe(sentinel);
    return () => obs.disconnect();
  }, [hasMore]);

  // ── Операции с листками ───────────────────────────────────────────────────────────────────────────
  const merge = useSheetMerge(sheets);
  const edit  = useSheetEdit(sheets);
  const clone = useSheetClone(sheets);

  const handleOpen = useCallback(
    (id: number) => navigate(getRouteSheetDetail(String(id))),
    [navigate],
  );

  const handleDelete = useCallback(async (id: number) => {
    // Офлайн-листок — удаляем только из localStorage
    if (id < 0) {
      const ok = await merge.confirm({
        title: 'Удалить офлайн-листок?',
        description: 'Листок не был синхронизирован с сервером.',
        variant: 'danger',
      });
      if (ok) removePendingSheet(id);
      return;
    }
    // Серверный листок
    const ok = await merge.confirm({
      title: 'Удалить листок осмотра?',
      description: 'Все дефекты будут удалены. Это действие необратимо.',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await deleteSheet(id).unwrap();
      merge.removeFromSelection(id);
      toast.success('Листок осмотра удалён');
    } catch (e) {
      logger.error('Delete sheet failed', e);
      toast.error('Ошибка при удалении листка осмотра');
    }
  }, [merge, deleteSheet]);

  // Клонирование / редактирование недоступно для офлайн-листков
  const handleClone = useCallback((id: number) => {
    if (id < 0) return;
    clone.handleOpenClone(id);
  }, [clone]);

  const handleEdit = useCallback((id: number) => {
    if (id < 0) return;
    edit.handleOpenEdit(id);
  }, [edit]);

  const handleDateRangeChange = useCallback(
    ({ from, to }: { from: string; to: string }) => { setDateFrom(from); setDateTo(to); },
    [],
  );

  return (
    <div className={cls.wrapper}>
      <div className={cls.filterBar}>
        <DateRangeFilter dateFrom={dateFrom} dateTo={dateTo} onChange={handleDateRangeChange} />
        {merge.selectedIds.size >= 2 && (
          <Button variant='primary' size='s' onClick={merge.handleOpenMerge} className={cls.mergeBtn}>
            Объединить {merge.selectedIds.size} листка
          </Button>
        )}
        {merge.selectedIds.size === 1 && (
          <span className={`${cls.filterHint} ${cls.mergeHint}`}>
            Выберите ещё листок линии «{merge.mergeLineName}» для объединения
          </span>
        )}
      </div>

      <div className={cls.tableWrapper} ref={tableWrapperRef}>
        {isLoading ? (
          <div className={cls.center}><Loader /></div>
        ) : sheets.length === 0 ? (
          <EmptyState
            title={hasSearch || hasDateFilter ? 'Ничего не найдено' : 'Нет листков осмотра'}
            description={hasSearch || hasDateFilter
              ? 'Попробуйте изменить параметры фильтрации.'
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
              onClone={handleClone}
              onEdit={handleEdit}
              selectedIds={merge.selectedIds}
              onSelect={merge.handleSelect}
              mergeLineId={merge.mergeLineId}
            />
            {hasMore && <div ref={sentinelRef} className={cls.sentinel}><Loader /></div>}
          </>
        )}
      </div>

      {/* Редактирование листка */}
      {edit.editTargetId !== null && (
        <Modal
          isOpen
          title="Редактировать листок"
          onClose={edit.handleCloseEdit}
          footer={
            <>
              <Button variant="ghost" size="s" onClick={edit.handleCloseEdit}>Отмена</Button>
              <Button variant="primary" size="s" loading={edit.updating} onClick={edit.handleSaveEdit}>Сохранить</Button>
            </>
          }
        >
          <VStack gap='3'>
            <FormField label="Дата осмотра" htmlFor="edit-date">
              <Input id="edit-date" type="date" value={edit.editDate} onChange={edit.setEditDate} />
            </FormField>
            <FormField label="Осматривал" htmlFor="edit-by">
              <Input id="edit-by" value={edit.editBy} onChange={edit.setEditBy} placeholder="Фамилия И.О." />
            </FormField>
          </VStack>
        </Modal>
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
