import { memo } from 'react';
import { formatDate } from '@/shared/lib/helpers/formatDate';
import { KebabMenu } from '@/shared/ui/KebabMenu';
import type { DefectSubGroup } from '../lib/groupDefects';
import type { DefectRecordFull } from '../model/types';
import cls from './DefectSubRow.module.scss';
import { TableRow, TableTd } from '@/shared/ui';

interface DefectSubRowProps {
  group: DefectSubGroup;
  index: number;
  defectStartIndex: number;
  locationKey: string;
  records: DefectRecordFull[];
  isFixed: boolean;
  editable: boolean;
  onFixOne: (defectId: number) => void;
  onCopy: (key: string) => void;
  onDelete: (id: number) => void;
  onDeleteAll: (ids: number[]) => void;
  onEdit?: (defect: DefectRecordFull) => void;
  onRowClick?: (defect: DefectRecordFull) => void;
  canFix?: boolean;
  canCopy?: boolean;
  canDelete?: boolean;
}

/** Строка конкретного дефекта внутри раскрытой опоры/пролёта. */
export const DefectSubRow = memo(({
  group,
  index,
  defectStartIndex,
  locationKey,
  records,
  isFixed,
  editable,
  onFixOne,
  onCopy,
  onDelete,
  onDeleteAll,
  onEdit,
  onRowClick,
  canFix = true,
  canCopy = true,
  canDelete = true,
}: DefectSubRowProps) => {
  const { first, ids, phases, insulatorCount, garlandNumber } = group;

  const subKebabItems = [
    ...(!isFixed && canFix
      ? [{ id: 'fix', label: 'Устранить', onClick: () => onFixOne(ids[0]) }]
      : []),
    ...(canCopy ? [{ id: 'copy', label: 'Копировать', onClick: () => onCopy(locationKey) }] : []),
    // Несколько фаз — отдельная запись на каждую фазу: свой пункт для каждой.
    ...(editable
      ? records.filter((r) => ids.includes(r.id)).map((r) => ({
        id: `edit-${r.id}`,
        label: ids.length > 1 && r.phaseName ? `Исправить (фаза ${r.phaseName})` : 'Исправить дефект',
        onClick: () => onEdit?.(r),
      }))
      : []),
    ...(canDelete ? [{
      id: 'delete',
      label: 'Удалить',
      danger: true,
      onClick: () => (ids.length === 1 ? onDelete(ids[0]) : onDeleteAll(ids)),
    }] : []),
  ];

  return (
    <TableRow
      className={cls.subRow}
      onClick={onRowClick ? () => onRowClick(first) : undefined}
      style={onRowClick ? { cursor: 'pointer' } : undefined}
    >
      <TableTd className={cls.subCell}>
        <span className={cls.subIdx}>{defectStartIndex + index + 1}</span>
      </TableTd>
      <TableTd className={cls.subCell} />
      <TableTd className={cls.subCell}>{first.elementName}</TableTd>
      <TableTd className={cls.subCell}>
        {first.defectName}
        {garlandNumber != null && garlandNumber > 0 && <span className={cls.phaseTag}>гирл. {garlandNumber}</span>}
        {phases && <span className={cls.phaseTag}>{phases}</span>}
        {insulatorCount != null && insulatorCount > 0 && <span className={cls.phaseTag}>{insulatorCount} шт.</span>}
      </TableTd>
      <TableTd className={cls.subCell}>{formatDate(first.dateFound)}</TableTd>
      <TableTd className={cls.subCell}>{first.inspectorFind}</TableTd>
      <TableTd className={cls.subCellNote}>
        {first.notes
          ? <span className={cls.noteCell} title={first.notes ?? undefined}>{first.notes}</span>
          : <span className={cls.noteCellEmpty}>—</span>}
      </TableTd>
      {isFixed && (
        <>
          <TableTd className={cls.subCell}>{first.dateFixed ? formatDate(first.dateFixed) : '—'}</TableTd>
          <TableTd className={cls.subCell}>{first.inspectorFix ?? '—'}</TableTd>
        </>
      )}
      <TableTd className={cls.subCell} />
      <TableTd className={cls.subCell}>
        <div className={cls.subActions}>
          {subKebabItems.length > 0 && <KebabMenu items={subKebabItems} ariaLabel='Действия с дефектом' />}
        </div>
      </TableTd>
    </TableRow>
  );
});
DefectSubRow.displayName = 'DefectSubRow';
