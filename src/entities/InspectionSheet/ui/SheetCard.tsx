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
}

export const SheetCard = memo((props: SheetCardProps) => {
  const { sheet, index, onOpen, onDelete, onClone, showFilial = true } = props;

  const handleRowClick = useCallback(() => onOpen(sheet.id), [onOpen, sheet.id]);
  const stopRowClick   = useCallback((e: React.MouseEvent) => e.stopPropagation(), []);
  const handleDelete   = useCallback(() => onDelete(sheet.id), [onDelete, sheet.id]);
  const handleClone    = useCallback(() => onClone(sheet.id), [onClone, sheet.id]);

  return (
    <tr className={cls.row} onClick={handleRowClick}>
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
        <div style={{ display:'flex', alignItems:'center', gap:4 }}>
          <Badge variant={sheet.fixedCount > 0 ? 'success' : 'neutral'}>
            {sheet.fixedCount}
          </Badge>
          {(sheet.activeCount + sheet.fixedCount) > 0 && (
            <div style={{ width:36, height:4, borderRadius:2, background:'rgba(148,163,184,.2)', overflow:'hidden', flexShrink:0 }}>
              <div style={{
                height:'100%',
                width: `${Math.round(sheet.fixedCount / (sheet.activeCount + sheet.fixedCount) * 100)}%`,
                background: '#22c55e',
                transition: 'width .4s ease',
              }} />
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
              aria-label="Действия с листком"
            >
              ⋮
            </button>
          )}
        >
          {({ close }) => (
            <>
              <button
                type="button"
                role="menuitem"
                className={cls.menuItem}
                onClick={() => { close(); onOpen(sheet.id); }}
              >
                Открыть
              </button>
              <button
                type="button"
                role="menuitem"
                className={cls.menuItem}
                onClick={() => { close(); handleClone(); }}
              >
                Копировать с новой датой
              </button>
              <button
                type="button"
                role="menuitem"
                className={`${cls.menuItem} ${cls.menuItemDanger}`}
                onClick={() => { close(); handleDelete(); }}
              >
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
