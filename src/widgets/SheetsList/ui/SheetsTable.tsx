import { memo, useCallback, useEffect, useRef } from 'react';
import type { InspectionSheetFull } from '@/entities/InspectionSheet';
import { SheetCard } from '@/entities/InspectionSheet';
import { Table, TableBody, TableHead, TableRow, TableTh, ThSort } from '@/shared/ui';
import type { SheetSortKey, SortDir } from '../model/useSheetsList';
import cls from './SheetsTable.module.scss';

export interface SheetsTableProps {
  sheets: ReadonlyArray<InspectionSheetFull>;
  showFilial: boolean;
  sortKey: SheetSortKey;
  sortDir: SortDir;
  onSort: (key: SheetSortKey) => void;
  onOpen: (id: number) => void;
  onDelete?: (id: number) => void;
  /** Удаление серверных листков (право sheets.delete). Офлайн-листки удаляются всегда. */
  canDeleteServer?: boolean;
  onClone?: (id: number) => void;
  onEdit?: (id: number) => void;
  selectedIds?: ReadonlySet<number>;
  onSelect?: (id: number, checked: boolean) => void;
  /** lineId of the first selected sheet — disables other lines */
  mergeLineId?: number | null;
}

export const SheetsTable = memo((props: SheetsTableProps) => {
  const { sheets, showFilial, sortKey, sortDir, onSort, onOpen, onDelete, canDeleteServer, onClone, onEdit, selectedIds, onSelect, mergeLineId } = props;

  // Выделение протяжкой: старт — mousedown на строке, движение — mousemove по строкам.
  const dragRef = useRef<{
    value: boolean;
    moved: boolean;
    startId: number | null;
    lastId: number | null;
  } | null>(null);
  const suppressClickRef = useRef(false);

  useEffect(() => {
    const stopDrag = () => {
      if (dragRef.current?.moved) {
        // Протяжка уже изменила выбор — гасим одиночный change от чекбокса.
        suppressClickRef.current = true;
        window.setTimeout(() => { suppressClickRef.current = false; }, 300);
      }
      dragRef.current = null;
      document.body.style.userSelect = '';
    };
    window.addEventListener('mouseup', stopDrag);
    return () => {
      window.removeEventListener('mouseup', stopDrag);
      document.body.style.userSelect = '';
    };
  }, []);

  const handleSelectStart = useCallback((id: number, e: React.MouseEvent) => {
    if (!onSelect || e.button !== 0) return;
    suppressClickRef.current = false;
    dragRef.current = {
      value: !selectedIds?.has(id),
      moved: false,
      startId: id,
      lastId: id,
    };
    document.body.style.userSelect = 'none';
  }, [onSelect, selectedIds]);

  const handleSelectEnter = useCallback((id: number, disabled?: boolean) => {
    const drag = dragRef.current;
    if (!drag || !onSelect || disabled) return;
    if (drag.lastId === id) return;
    drag.lastId = id;
    drag.moved = true;

    const startIndex = sheets.findIndex((s) => s.id === drag.startId);
    const endIndex = sheets.findIndex((s) => s.id === id);
    if (startIndex < 0 || endIndex < 0) return;

    // Закрашиваем весь диапазон, даже если курсор проскочил строки.
    const from = Math.min(startIndex, endIndex);
    const to = Math.max(startIndex, endIndex);
    for (let i = from; i <= to; i += 1) {
      const sheet = sheets[i];
      if (sheet.lineId === mergeLineId || mergeLineId == null) {
        onSelect(sheet.id, drag.value);
      }
    }
  }, [mergeLineId, onSelect, sheets]);

  // Определяем строку под курсором глобально: mouseenter при зажатой кнопке ненадёжен.
  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      const row = el?.closest<HTMLElement>('[data-sheet-id]');
      if (!row) return;
      const id = Number(row.dataset.sheetId);
      if (!Number.isFinite(id)) return;
      handleSelectEnter(id, row.dataset.sheetDisabled === '1');
    };
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, [handleSelectEnter]);

  const handleSelectChange = useCallback((id: number, checked: boolean) => {
    if (suppressClickRef.current) return;
    onSelect?.(id, checked);
  }, [onSelect]);

  return (
    <Table className={cls.table}>
      <TableHead>
        <TableRow>
          {onSelect && <TableTh className={`${cls.th} ${cls.colSelect}`} />}
          <TableTh className={cls.th}>#</TableTh>
          {showFilial && <TableTh className={cls.th}>Филиал</TableTh>}
          <ThSort label="Напряжение" dir={sortKey === 'voltage' ? sortDir : undefined} onClick={() => onSort('voltage')} />
          <TableTh className={cls.th}>Линия</TableTh>
          <ThSort label="Дата" dir={sortKey === 'date' ? sortDir : undefined} onClick={() => onSort('date')} />
          <ThSort label="Осматривал" dir={sortKey === 'inspector' ? sortDir : undefined} onClick={() => onSort('inspector')} />
          <TableTh className={cls.th}>Активных</TableTh>
          <TableTh className={cls.th}>Устранено</TableTh>
          <TableTh className={cls.th} />
        </TableRow>
      </TableHead>
      <TableBody>
        {sheets.map((sheet, idx) => (
          <SheetCard
            key={sheet.id}
            sheet={sheet}
            index={idx + 1}
            onOpen={onOpen}
            onDelete={onDelete}
            canDeleteServer={canDeleteServer}
            onClone={onClone}
            onEdit={onEdit}
            showFilial={showFilial}
            selected={selectedIds?.has(sheet.id)}
            onSelect={onSelect ? handleSelectChange : undefined}
            onSelectStart={onSelect ? handleSelectStart : undefined}
            suppressOpen={onSelect ? () => suppressClickRef.current : undefined}
            disabledForMerge={mergeLineId != null && sheet.lineId !== mergeLineId}
          />
        ))}
      </TableBody>
    </Table>
  );
});

SheetsTable.displayName = 'SheetsTable';
