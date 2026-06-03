import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ConfirmModal, EmptyState, Loader, Modal, Button, useConfirm } from '@/shared/ui';
import { getRouteSheetDetail } from '@/shared/const/router';
import { useCloneSheetMutation } from '@/entities/InspectionSheet';
import { toast } from '@/shared/lib/toast';
import { logger } from '@/shared/lib/logger';
import { useSheetsList, StatusFilter } from '../model/useSheetsList';
import { formatIsoDate } from '../lib/formatIsoDate';
import { DateRangeFilter } from './DateRangeFilter';
import { SheetsTable } from './SheetsTable';
import cls from './SheetsList.module.scss';

const INITIAL_SHEETS = 30;
const LOAD_MORE_SHEETS = 30;

interface StatusTab { key: StatusFilter; label: string; }
const STATUS_TABS: StatusTab[] = [
  { key: 'all',      label: 'Все'       },
  { key: 'active',   label: 'Активные'  },
  { key: 'archived', label: 'Архив'     },
  { key: 'draft',    label: 'Черновики' },
];

export const SheetsList = memo(() => {
  const navigate = useNavigate();
  const { confirm, confirmProps } = useConfirm();

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo,   setDateTo]   = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const { sheets, isLoading, isAdmin, deleteSheet, hasSearch, sortKey, sortDir, toggleSort, statusCounts } =
    useSheetsList({ dateFrom, dateTo, statusFilter });

  // ── Infinite scroll ──────────────────────────────────────────────────────
  const [displayCount, setDisplayCount] = useState(INITIAL_SHEETS);
  const tableWrapperRef = useRef<HTMLDivElement>(null);
  const sentinelRef     = useRef<HTMLDivElement>(null);

  const filtersKey = [hasSearch, dateFrom, dateTo, statusFilter, sortKey, sortDir].join('|');
  useEffect(() => { setDisplayCount(INITIAL_SHEETS); }, [filtersKey]); // eslint-disable-line

  const visibleSheets = sheets.slice(0, displayCount);
  const hasMore = displayCount < sheets.length;

  useEffect(() => {
    const sentinel = sentinelRef.current;
    const wrapper  = tableWrapperRef.current;
    if (!sentinel || !wrapper || !hasMore) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setDisplayCount((p) => p + LOAD_MORE_SHEETS); },
      { root: wrapper, threshold: 0 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore]);

  // ── Clone ────────────────────────────────────────────────────────────────
  const [cloneTargetId, setCloneTargetId] = useState<number | null>(null);
  const [cloneDate,     setCloneDate]     = useState('');
  const [cloneSheet, { isLoading: cloning }] = useCloneSheetMutation();

  const handleOpenClone = useCallback((id: number) => {
    setCloneTargetId(id);
    setCloneDate(new Date().toISOString().slice(0, 10));
  }, []);

  const handleCloseClone = useCallback(() => {
    setCloneTargetId(null);
    setCloneDate('');
  }, []);

  const handleClone = useCallback(async () => {
    if (!cloneTargetId || !cloneDate) return;
    try {
      const result = await cloneSheet({ id: cloneTargetId, newDate: cloneDate }).unwrap();
      handleCloseClone();
      navigate(getRouteSheetDetail(String(result.id)));
    } catch (err) {
      logger.error('Clone sheet failed', err);
      toast.error('Ошибка клонирования');
    }
  }, [cloneTargetId, cloneDate, cloneSheet, handleCloseClone, navigate]);

  // ── Open / Delete ────────────────────────────────────────────────────────
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

  const countFor = (key: StatusFilter) => statusCounts[key === 'all' ? 'all' : key === 'active' ? 'active' : key === 'archived' ? 'archived' : 'draft'];
  const cloneTarget = sheets.find((s) => s.id === cloneTargetId);

  return (
    <div className={cls.wrapper}>
      <div className={cls.statusTabs}>
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            className={[cls.statusTab, statusFilter === tab.key ? cls.statusTabActive : ''].join(' ')}
            data-status={tab.key}
            onClick={() => setStatusFilter(tab.key)}
          >
            <span className={cls.statusTab__label}>{tab.label}</span>
            <span className={cls.statusTab__count}>{countFor(tab.key)}</span>
          </button>
        ))}
      </div>

      <div className={cls.filterBar}>
        <DateRangeFilter dateFrom={dateFrom} dateTo={dateTo} onChange={handleDateRangeChange} />
        {!!(dateFrom || dateTo) && (
          <span className={cls.filterHint}>
            Период: {formatIsoDate(dateFrom) || 'начало'} — {formatIsoDate(dateTo) || 'конец'}
          </span>
        )}
      </div>

      <div className={cls.tableWrapper} ref={tableWrapperRef}>
        {isLoading ? (
          <div className={cls.center}><Loader /></div>
        ) : sheets.length === 0 ? (
          <EmptyState
            title={hasSearch || !!(dateFrom || dateTo) || statusFilter !== 'all' ? 'Ничего не найдено' : 'Нет листков осмотра'}
            description={hasSearch || !!(dateFrom || dateTo) || statusFilter !== 'all'
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
            />
            {hasMore && <div ref={sentinelRef} className={cls.sentinel}><Loader /></div>}
          </>
        )}
      </div>

      {/* Clone modal */}
      <Modal
        isOpen={!!cloneTargetId}
        onClose={handleCloseClone}
        size="s"
        title="Копировать листок осмотра"
        footer={
          <>
            <Button variant="secondary" size="m" onClick={handleCloseClone}>Отмена</Button>
            <Button variant="primary" size="m" onClick={handleClone} disabled={!cloneDate || cloning}
              loading={cloning}>
              Создать копию
            </Button>
          </>
        }
      >
        <div style={{ display:'flex', flexDirection:'column', gap:'var(--space-4)' }}>
          {cloneTarget && (
            <p style={{ fontSize:'var(--font-size-s)', color:'var(--color-text-secondary)', lineHeight:'var(--line-height-relaxed)' }}>
              Будет создана копия листка «{cloneTarget.lineName}» с новой датой. Дефекты не копируются.
            </p>
          )}
          <input
            type="date"
            value={cloneDate}
            onChange={(e) => setCloneDate(e.target.value)}
            style={{
              width:'100%', padding:'var(--space-2) var(--space-3)', borderRadius:'var(--radii)',
              border:'1px solid var(--color-border)', background:'var(--color-bg-page)',
              color:'var(--color-text-primary)', fontSize:'var(--font-size-m)', fontFamily:'var(--font-family-main)',
            }}
          />
        </div>
      </Modal>

      <ConfirmModal {...confirmProps} />
    </div>
  );
});

SheetsList.displayName = 'SheetsList';
