import { memo, useCallback } from 'react';
import { formatDate } from '@/shared/lib/helpers/formatDate';
import { Badge, Dropdown } from '@/shared/ui';
import type { InspectionSheetFull } from '../model/types';
import { IconTrash } from '@/shared/ui/Icons';
import cls from './SheetCard.module.scss';

export interface SheetCardProps {
  sheet: InspectionSheetFull;
  index: number;
  onOpen: (id: number) => void;
  onDelete: (id: number) => void;
  onClone: (id: number) => void;
  showFilial?: boolean;
  selected?: boolean;
  onSelect?: (id: number, checked: boolean) => void;
  /** Недоступен для выбора слияния (другая линия) */
  disabledForMerge?: boolean;
}

export const SheetCard = memo((props: SheetCardProps) => {
  const { sheet, index, onOpen, onDelete, onClone, showFilial = true, selected, onSelect, disabledForMerge } = props;

  const handleRowClick = useCallback(() => onOpen(sheet.id), [onOpen, sheet.id]);
  const stopRowClick   = useCallback((e: React.MouseEvent) => e.stopPropagation(), []);
  const handleDelete   = useCallback(() => onDelete(sheet.id), [onDelete, sheet.id]);
  const handleClone    = useCallback(() => onClone(sheet.id), [onClone, sheet.id]);
  const handleCheck    = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    onSelect?.(sheet.id, e.target.checked);
  }, [onSelect, sheet.id]);

  const total = sheet.activeCount + sheet.fixedCount;
  const fixedPct = total > 0 ? Math.round(sheet.fixedCount / total * 100) : 0;

  return (
    <tr className={`${cls.row} ${disabledForMerge ? cls.rowDisabled : ''}`} onClick={handleRowClick}>
      {onSelect && (
        <td className={cls.cellCheck} onClick={stopRowClick}>
          <input
            type="checkbox"
            checked={!!selected}
            onChange={handleCheck}
            disabled={disabledForMerge}
          />
        </td>
      )}
      <td className={cls.cell}>{index}</td>
      {showFilial && <td className={cls.cell}>{sheet.filialName}</td>}
      <td className={cls.cell}>{sheet.voltageName}</td>
      <td className={`${cls.cell} ${cls.lineCell}`}>{sheet.lineName}</td>
      <td className={cls.cell}>{formatDate(sheet.createdDate)}</td>
      <td className={cls.cell}>{sheet.createdBy}</td>
      <td className={cls.cell}>
        <Badge variant={sheet.activeCount > 0 ? 'danger' : 'neutral'}>
          {sheet.activeCount}
        </Badge>
      </td>
      <td className={cls.cell}>
        <div className={cls.fixedCell}>
          <Badge variant={sheet.fixedCount > 0 ? 'success' : 'neutral'}>
            {sheet.fixedCount}
          </Badge>
          {total > 0 && (
            <div className={cls.progressTrack}>
              <div className={cls.progressBar} style={{ width: `${fixedPct}%` }} />
            </div>
          )}
        </div>
      </td>
      <td className={cls.cell} onClick={stopRowClick}>
        <Dropdown
          placement="bottom-end"
          trigger={({ open, toggle }) => (
            <button
              type="button"
              className={cls.menuBtn}
              onClick={toggle}
              aria-haspopup="menu"
              aria-expanded={open}
            >
              &#8942;
            </button>
          )}
        >
          {({ close }) => (
            <>
              <button type="button" role="menuitem" className={cls.menuItem}
                onClick={() => { close(); onOpen(sheet.id); }}>
                Открыть
              </button>
              <button type="button" role="menuitem" className={cls.menuItem}
                onClick={() => { close(); handleClone(); }}>
                Копировать с новой датой
              </button>
              <button type="button" role="menuitem"
                className={`${cls.menuItem} ${cls.menuItemDanger}`}
                onClick={() => { close(); handleDelete(); }}>
                <IconTrash size={13} /> Удалить
              </button>
            </>
          )}
        </Dropdown>
      </td>
    </tr>
  );
});

SheetCard.displayName = 'SheetCard';
