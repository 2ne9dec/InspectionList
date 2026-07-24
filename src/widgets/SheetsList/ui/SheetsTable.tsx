import { memo } from 'react';
import type { InspectionSheetFull } from '@/entities/InspectionSheet';
import { SheetCard } from '@/entities/InspectionSheet';
import { ThSort } from '@/shared/ui';
import type { SheetSortKey, SortDir } from '../model/useSheetsList';
import cls from './SheetsTable.module.scss';

export interface SheetsTableProps {
  sheets: ReadonlyArray<InspectionSheetFull>;
  showFilial: boolean;
  sortKey: SheetSortKey;
  sortDir: SortDir;
  onSort: (key: SheetSortKey) => void;
  onOpen: (id: number) => void;
  onDelete: (id: number) => void;
  onClone: (id: number) => void;
  onEdit?: (id: number) => void;
  selectedIds?: ReadonlySet<number>;
  onSelect?: (id: number, checked: boolean) => void;
  /** lineId of the first selected sheet — disables other lines */
  mergeLineId?: number | null;
}

export const SheetsTable = memo((props: SheetsTableProps) => {
  const { sheets, showFilial, sortKey, sortDir, onSort, onOpen, onDelete, onClone, onEdit, selectedIds, onSelect, mergeLineId } = props;
  return (
    <table className={cls.table}>
      <thead>
        <tr>
          {onSelect && <th className={cls.th} style={{ width: 32 }} />}
          <th className={cls.th}>#</th>
          {showFilial && <th className={cls.th}>Филиал</th>}
          <ThSort label="Напряжение" dir={sortKey === 'voltage' ? sortDir : undefined} onClick={() => onSort('voltage')} />
          <th className={cls.th}>Линия</th>
          <ThSort label="Дата" dir={sortKey === 'date' ? sortDir : undefined} onClick={() => onSort('date')} />
          <ThSort label="Осматривал" dir={sortKey === 'inspector' ? sortDir : undefined} onClick={() => onSort('inspector')} />
          <th className={cls.th}>Активных</th>
          <th className={cls.th}>Устранено</th>
          <th className={cls.th} />
        </tr>
      </thead>
      <tbody>
        {sheets.map((sheet, idx) => (
          <SheetCard
            key={sheet.id}
            sheet={sheet}
            index={idx + 1}
            onOpen={onOpen}
            onDelete={onDelete}
            onClone={onClone}
            onEdit={onEdit}
            showFilial={showFilial}
            selected={selectedIds?.has(sheet.id)}
            onSelect={onSelect}
            disabledForMerge={mergeLineId != null && sheet.lineId !== mergeLineId}
          />
        ))}
      </tbody>
    </table>
  );
});

SheetsTable.displayName = 'SheetsTable';
