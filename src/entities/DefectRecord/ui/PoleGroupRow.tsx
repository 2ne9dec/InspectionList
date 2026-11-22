import { memo, useMemo } from 'react';
import { KebabMenu } from '@/shared/ui/KebabMenu';
import { formatLocationLabel, locationKeyType } from '../lib/locationKey';
import { groupDefectRows } from '../lib/groupDefects';
import type { DefectRecordFull } from '../model/types';
import { DefectSubRow } from './DefectSubRow';
import { PoleElementChips } from './PoleElementChips';
import cls from './PoleGroupRow.module.scss';
import { TableRow, TableTd } from '@/shared/ui';

interface PoleGroupRowProps {
  /** Ключ группы: "о:253" — опора, "п:250-300" — Пролёты */
  locationKey: string;
  /** Порядковый номер строки в таблице */
  index: number;
  records: DefectRecordFull[];
  isExpanded: boolean;
  anyExpanded: boolean;
  isFixed: boolean;
  onToggle: (key: string) => void;
  onFix: (key: string) => void;
  onFixOne: (defectId: number) => void;
  onCopy: (key: string) => void;
  defectStartIndex?: number;
  onRowClick?: (defect: DefectRecordFull) => void;
  onDelete: (id: number) => void;
  onDeleteAll: (ids: number[]) => void;
  /** Исправить ошибочно внесённый дефект. */
  onEdit?: (defect: DefectRecordFull) => void;
  /** Доступные действия (по правам роли); недоступные пункты меню скрыты. */
  canFix?: boolean;
  canCopy?: boolean;
  canDelete?: boolean;
  canEdit?: boolean;
}

export const PoleGroupRow = memo((props: PoleGroupRowProps) => {
  const {
    locationKey,
    index,
    records,
    isExpanded,
    anyExpanded,
    isFixed,
    onToggle,
    onFix,
    onFixOne,
    onCopy,
    onDelete,
    onDeleteAll,
    onEdit,
    onRowClick,
    defectStartIndex = 0,
    canFix = true,
    canCopy = true,
    canDelete = true,
    canEdit = false,
  } = props;
  // Исправлять можно только неустранённые дефекты
  const editable = canEdit && !isFixed && !!onEdit;

  const locationLabel = formatLocationLabel(locationKey);
  const span = locationKeyType(locationKey) === 'span';

  const uniqueElements = useMemo(() => Array.from(new Set(records.map((r) => r.elementName))), [records]);
  const subGroups = useMemo(
    () => (isExpanded ? groupDefectRows(records) : []),
    [isExpanded, records],
  );

  // +1 за колонку №, +1 за колонку Опора/Пролёты
  const middleEmptyCells = anyExpanded ? (isFixed ? 6 : 4) : 0;

  const groupKebabItems = useMemo(() => {
    const items = [];
    if (!isFixed && canFix) {
      items.push({ id: 'fix', label: 'Устранить все', onClick: () => onFix(locationKey) });
    }
    if (canCopy) items.push({ id: 'copy', label: 'Копировать', onClick: () => onCopy(locationKey) });
    // В группе один дефект — его можно исправить прямо отсюда
    if (editable && records.length === 1) items.push({ id: 'edit', label: 'Исправить дефект', onClick: () => onEdit?.(records[0]) });
    if (canDelete) items.push({
      id: 'delete',
      label: 'Удалить все',
      danger: true,
      onClick: () => onDeleteAll(records.map((r) => r.id)),
    });
    return items;
  }, [isFixed, locationKey, onFix, onCopy, onDeleteAll, records, canFix, canCopy, canDelete, editable, onEdit]);

  return (
    <>
      <TableRow className={`${cls.groupRow} ${isExpanded ? cls.open : ''}`} onClick={() => onToggle(locationKey)} data-pole-key={locationKey}>
        {/* Порядковый номер */}
        <TableTd className={`${cls.cell} ${cls.cellIndex}`}>
          {index}
        </TableTd>

        {/* Опора / Пролёты */}
        <TableTd className={cls.cell}>
          <span className={cls.expandIcon} aria-hidden>
            {isExpanded ? '▼' : '▶'}
          </span>
          <strong className={cls.poleNum}>
            {span && (
              <span className={cls.spanLabel}>пр.</span>
            )}
            {locationLabel}
          </strong>
        </TableTd>

        {/* Элементы (chips) */}
        <TableTd className={cls.cell}>
          {!isExpanded && <PoleElementChips elements={uniqueElements} />}
        </TableTd>

        {Array.from({ length: middleEmptyCells }).map((_, i) => (
          <TableTd key={i} className={cls.cell} />
        ))}

        <TableTd className={cls.cell}>
          <span
            className={cls.badge}
          >
            {records.length} деф.
          </span>
        </TableTd>

        <TableTd className={cls.cell} onClick={(e) => e.stopPropagation()}>
          <div className={cls.actions}>
            {groupKebabItems.length > 0 && <KebabMenu items={groupKebabItems} ariaLabel='Действия' size='m' />}
          </div>
        </TableTd>
      </TableRow>

      {isExpanded &&
        subGroups.map((group, idx) => (
          <DefectSubRow
            key={group.key}
            group={group}
            index={idx}
            defectStartIndex={defectStartIndex}
            locationKey={locationKey}
            records={records}
            isFixed={isFixed}
            editable={editable}
            onFixOne={onFixOne}
            onCopy={onCopy}
            onDelete={onDelete}
            onDeleteAll={onDeleteAll}
            onEdit={onEdit}
            onRowClick={onRowClick}
            canFix={canFix}
            canCopy={canCopy}
            canDelete={canDelete}
          />
        ))}
    </>
  );
});

PoleGroupRow.displayName = 'PoleGroupRow';
