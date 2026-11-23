import { memo, useCallback, useEffect, useRef } from 'react';
import type { JournalRow } from '../model/useJournalFilters';
import { Checkbox, Table, TableBody, TableHead, TableRow, TableTd, TableTh } from '@/shared/ui';
import { JournalTableRow } from './JournalTableRow';
import cls from './JournalTable.module.scss';

interface JournalTableProps {
  rows:       JournalRow[];
  selectedIds: Set<number>;
  allSelected: boolean;
  onSelectAll: (checked: boolean) => void;
  onSelect:    (id: number, checked: boolean) => void;
  onEditRow:   (id: number) => void;
  /** Только просмотр: выбор строк и заключение мастера недоступны */
  readOnly?:   boolean;
}

export const JournalTable = memo(({
  rows,
  selectedIds,
  allSelected,
  onSelectAll,
  onSelect,
  onEditRow,
  readOnly,
}: JournalTableProps) => {
  // Выделение протяжкой: старт на строке, движение — глобальный mousemove.
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
        // После протяжки не открываем заключение и не переключаем чекбокс.
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
    if (readOnly || e.button !== 0) return;
    const row = rows.find((r) => r.d.id === id);
    if (!row || row.d.isFixed) return;

    suppressClickRef.current = false;
    dragRef.current = {
      value: !selectedIds.has(id),
      moved: false,
      startId: id,
      lastId: id,
    };
    document.body.style.userSelect = 'none';
  }, [readOnly, rows, selectedIds]);

  const handleSelectChange = useCallback((id: number, checked: boolean) => {
    if (suppressClickRef.current) return;
    onSelect(id, checked);
  }, [onSelect]);

  const handleEdit = useCallback((id: number) => {
    if (suppressClickRef.current) return;
    onEditRow(id);
  }, [onEditRow]);

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      const drag = dragRef.current;
      if (!drag) return;

      const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      const rowEl = el?.closest<HTMLElement>('[data-journal-id]');
      if (!rowEl || rowEl.dataset.journalDisabled === '1') return;

      const id = Number(rowEl.dataset.journalId);
      if (!Number.isFinite(id) || drag.lastId === id) return;
      drag.lastId = id;
      drag.moved = true;

      const startIndex = rows.findIndex((r) => r.d.id === drag.startId);
      const endIndex = rows.findIndex((r) => r.d.id === id);
      if (startIndex < 0 || endIndex < 0) return;

      // Закрашиваем весь диапазон, пропуская устранённые строки.
      const from = Math.min(startIndex, endIndex);
      const to = Math.max(startIndex, endIndex);
      for (let i = from; i <= to; i += 1) {
        const row = rows[i];
        if (!row.d.isFixed && !readOnly) onSelect(row.d.id, drag.value);
      }
    };

    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, [onSelect, readOnly, rows]);

  return (
    <div className={cls.tableWrap}>
      <Table className={cls.table}>
        <TableHead>
          <TableRow>
            <TableTh rowSpan={2} className={cls.thCheck}>
              <Checkbox
                checked={allSelected}
                disabled={readOnly}
                onChange={(e) => onSelectAll(e.target.checked)}
                aria-label='Выбрать все'
              />
            </TableTh>
            <TableTh rowSpan={2} className={cls.thNum}>№</TableTh>
            <TableTh rowSpan={2}>Класс напряжения</TableTh>
            <TableTh rowSpan={2}>Линия</TableTh>
            <TableTh rowSpan={2}>
              Дата<br/>обнаружения
            </TableTh>
            <TableTh rowSpan={2}>
              Ф.И.О.<br/>обнаружившего
            </TableTh>
            <TableTh rowSpan={2} className={cls.thLocation}>
              Место обнаружения неисправности
              <span className={cls.thSub}>(опора/пролёт / фаза / элемент: дефект)</span>
            </TableTh>
            <TableTh colSpan={2} className={cls.thGroup}>
              Заключение мастера по устранению
            </TableTh>
            <TableTh colSpan={2} className={cls.thGroup}>
              Информация об устранении неисправностей
            </TableTh>
          </TableRow>
          <TableRow>
            <TableTh>Мероприятия по устранению</TableTh>
            <TableTh>Срок устранения, Ф.И.О.</TableTh>
            <TableTh>Дата устранения, объём работ</TableTh>
            <TableTh>Ф.И.О. производителя работ</TableTh>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableTd colSpan={11} className={cls.empty}>
                Нет данных по выбранным фильтрам
              </TableTd>
            </TableRow>
          ) : rows.map((row, i) => (
            <JournalTableRow
              key={row.d.id}
              row={row}
              index={i}
              selected={selectedIds.has(row.d.id)}
              onSelect={handleSelectChange}
              onEdit={handleEdit}
              onSelectStart={readOnly ? undefined : handleSelectStart}
              readOnly={readOnly}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
});

JournalTable.displayName = 'JournalTable';
