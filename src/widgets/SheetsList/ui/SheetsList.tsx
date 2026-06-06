import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ConfirmModal, EmptyState, Loader, Button, useConfirm } from '@/shared/ui';
import { getRouteSheetDetail } from '@/shared/const/router';
import { useCloneSheetMutation, useMergeSheetsMutation } from '@/entities/InspectionSheet';
import { toast } from '@/shared/lib/toast';
import { logger } from '@/shared/lib/logger';
import { useSheetsList } from '../model/useSheetsList';
import { formatIsoDate } from '../lib/formatIsoDate';
import { DateRangeFilter } from './DateRangeFilter';
import { SheetsTable } from './SheetsTable';
import { CloneSheetModal } from './CloneSheetModal';
import { MergeSheetModal } from './MergeSheetModal';
import cls from './SheetsList.module.scss';

const INITIAL_SHEETS = 30;
const LOAD_MORE_SHEETS = 30;

export const SheetsList = memo(() => {
  const navigate = useNavigate();
  const { confirm, confirmProps } = useConfirm();

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo,   setDateTo]   = useState('');
  const { sheets, isLoading, isAdmin, deleteSheet, hasSearch, sortKey, sortDir, toggleSort } =
    useSheetsList({ dateFrom, dateTo, statusFilter: 'all' });

  // Infinite scroll
  const [displayCount, setDisplayCount] = useState(INITIAL_SHEETS);
  const tableWrapperRef = useRef<HTMLDivElement>(null);
  const sentinelRef     = useRef<HTMLDivElement>(null);

  const filtersKey = [hasSearch, dateFrom, dateTo, sortKey, sortDir].join('|');
  useEffect(() => { setDisplayCount(INITIAL_SHEETS); }, [filtersKey]); // eslint-disable-line

  const visibleSheets = sheets.slice(0, displayCount);
  const hasMore = displayCount < sheets.length;

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

  // Multi-select for merge
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [mergeOpen,   setMergeOpen]   = useState(false);
  const [mergeDate,   setMergeDate]   = useState('');
  const [mergeBy,     setMergeBy]     = useState('');
  const [mergeSheets, { isLoading: merging }] = useMergeSheetsMutation();

  const mergeLineId = useMemo(
    () => sheets.find((s) => selectedIds.has(s.id))?.lineId ?? null,
    [sheets, selectedIds],
  );
  const mergeLineName = useMemo(
    () => sheets.find((s) => selectedIds.has(s.id))?.lineName ?? '',
    [sheets, selectedIds],
  );

  const handleSelect = useCallback((id: number, checked: boolean) => {
    if (checked && mergeLineId !== null) {
      const sheet = sheets.find((s) => s.id === id);
      if (sheet && sheet.lineId !== mergeLineId) return;
    }
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) { next.add(id); } else { next.delete(id); }
      return next;
    });
  }, [sheets, mergeLineId]);

  const handleOpenMerge  = useCallback(() => {
    setMergeDate(new Date().toISOString().slice(0, 10));
    setMergeBy('');
    setMergeOpen(true);
  }, []);
  const handleCloseMerge = useCallback(() => setMergeOpen(false), []);

  const handleMerge = useCallback(async () => {
    if (selectedIds.size < 2 || !mergeDate) return;
    const ok = await confirm({
      title: `Объединить ${selectedIds.size} листка?`,
      description: 'Исходные листки и их дефекты будут удалены. Останется один сводный листок.',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      const result = await mergeSheets({
        ids: Array.from(selectedIds),
        createdDate: mergeDate,
        createdBy: mergeBy,
      }).unwrap();
      setSelectedIds(new Set());
      setMergeOpen(false);
      navigate(getRouteSheetDetail(String(result.id)));
      toast.success('Сводный листок создан');
    } catch (err) {
      logger.error('Merge sheets failed', err);
      toast.error('Ошибка объединения листков');
    }
  }, [selectedIds, mergeDate, mergeBy, mergeSheets, confirm, navigate]);

  const selectedSheets = useMemo(
    () => sheets.filter((s) => selectedIds.has(s.id)),
    [sheets, selectedIds],
  );

  // Clone
  const [cloneTargetId, setCloneTargetId] = useState<number | null>(null);
  const [cloneDate,     setCloneDate]     = useState('');
  const [cloneBy,       setCloneBy]       = useState('');
  const [cloneSheet, { isLoading: cloning }] = useCloneSheetMutation();

  const handleOpenClone = useCallback((id: number) => {
    const src = sheets.find((s) => s.id === id);
    setCloneTargetId(id);
    setCloneDate(new Date().toISOString().slice(0, 10));
    setCloneBy(src?.createdBy ?? '');
  }, [sheets]);

  const handleCloseClone = useCallback(() => {
    setCloneTargetId(null);
    setCloneDate('');
    setCloneBy('');
  }, []);

  const handleClone = useCallback(async () => {
    if (!cloneTargetId || !cloneDate) return;
    try {
      const result = await cloneSheet({
        id: cloneTargetId,
        newDate: cloneDate,
        createdBy: cloneBy,
      }).unwrap();
      handleCloseClone();
      navigate(getRouteSheetDetail(String(result.id)));
    } catch (err) {
      logger.error('Clone sheet failed', err);
      toast.error('Ошибка клонирования');
    }
  }, [cloneTargetId, cloneDate, cloneBy, cloneSheet, handleCloseClone, navigate]);

  const handleOpen = useCallback(
    (id: number) => navigate(getRouteSheetDetail(String(id))),
    [navigate],
  );

  const handleDelete = useCallback(async (id: number) => {
    const ok = await confirm({
      title: 'Удалить листок осмотра?',
      description: 'Все дефекты будут удалены. Это действие необратимо.',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await deleteSheet(id).unwrap();
      toast.success('Листок осмотра удалён');
    } catch (e) {
      logger.error('Delete sheet failed', e);
      toast.error('Ошибка при удалении листка осмотра');
    }
  }, [confirm, deleteSheet]);

  const handleDateRangeChange = useCallback(
    ({ from, to }: { from: string; to: string }) => { setDateFrom(from); setDateTo(to); },
    [],
  );

  const cloneTarget = sheets.find((s) => s.id === cloneTargetId);

  return (
    <div className={cls.wrapper}>
      <div className={cls.filterBar}>
        <DateRangeFilter dateFrom={dateFrom} dateTo={dateTo} onChange={handleDateRangeChange} />
        {!!(dateFrom || dateTo) && (
          <span className={cls.filterHint}>
            Период: {formatIsoDate(dateFrom) || 'начало'} — {formatIsoDate(dateTo) || 'конец'}
          </span>
        )}
        {selectedIds.size >= 2 && (
          <Button variant='primary' size='s' onClick={handleOpenMerge} className={cls.mergeBtn}>
            Объединить {selectedIds.size} листка
          </Button>
        )}
        {selectedIds.size === 1 && (
          <span className={`${cls.filterHint} ${cls.mergeHint}`}>
            Выберите ещё листок линии «{mergeLineName}» для объединения
          </span>
        )}
      </div>

      <div className={cls.tableWrapper} ref={tableWrapperRef}>
        {isLoading ? (
          <div className={cls.center}><Loader /></div>
        ) : sheets.length === 0 ? (
          <EmptyState
            title={hasSearch || !!(dateFrom || dateTo) ? 'Ничего не найдено' : 'Нет листков осмотра'}
            description={hasSearch || !!(dateFrom || dateTo)
              ? 'Попробуйте изменить параметры фильтрации.'
              : 'Создайте первый листок осмотра, чтобы начать работу.'}
          />
        ) : (
          <>
            <SheetsTable
              sheets={visibleSheets}
              showFilial={isAdmin}
              sortKey={sortKey}
              sortDir={sortDir}
              onSort={toggleSort}
              onOpen={handleOpen}
              onDelete={handleDelete}
              onClone={handleOpenClone}
              selectedIds={selectedIds}
              onSelect={handleSelect}
              mergeLineId={mergeLineId}
            />
            {hasMore && <div ref={sentinelRef} className={cls.sentinel}><Loader /></div>}
          </>
        )}
      </div>

      <CloneSheetModal
        isOpen={!!cloneTargetId}
        target={cloneTarget}
        date={cloneDate}
        createdBy={cloneBy}
        loading={cloning}
        onDateChange={setCloneDate}
        onCreatedByChange={setCloneBy}
        onClose={handleCloseClone}
        onConfirm={handleClone}
      />

      <MergeSheetModal
        isOpen={mergeOpen}
        selectedSheets={selectedSheets}
        date={mergeDate}
        createdBy={mergeBy}
        loading={merging}
        onDateChange={setMergeDate}
        onCreatedByChange={setMergeBy}
        onClose={handleCloseMerge}
        onConfirm={handleMerge}
      />

      <ConfirmModal {...confirmProps} />
    </div>
  );
});

SheetsList.displayName = 'SheetsList';
