import { memo, useCallback } from 'react';
import { formatDate } from '@/shared/lib/helpers/formatDate';
import { Badge, Button, Checkbox, Dropdown, TableRow, TableTd } from '@/shared/ui';
import type { InspectionSheetFull } from '../model/types';
import { IconOffline, IconTrash } from '@/shared/ui/Icons';
import cls from './SheetCard.module.scss';

export interface SheetCardProps {
  sheet: InspectionSheetFull;
  index: number;
  onOpen: (id: number) => void;
  /** Не передан — пункт «Удалить» скрыт (режим только просмотра). */
  onDelete?: (id: number) => void;
  /**
   * Удаление серверных листков разрешено (право sheets.delete).
   * Офлайн-листки (status='pending') можно удалять всегда — это локальная запись.
   */
  canDeleteServer?: boolean;
  /** Не передан — пункт «Копировать» скрыт (режим только просмотра). */
  onClone?: (id: number) => void;
  onEdit?: (id: number) => void;
  showFilial?: boolean;
  selected?: boolean;
  onSelect?: (id: number, checked: boolean) => void;
  /** Старт выделения протяжкой (mousedown на строке). */
  onSelectStart?: (id: number, e: React.MouseEvent) => void;
  /** Не открывать листок после протяжки. */
  suppressOpen?: () => boolean;
  /** Недоступен для выбора слияния (другая линия) */
  disabledForMerge?: boolean;
}

export const SheetCard = memo((props: SheetCardProps) => {
  const {
    sheet, index, onOpen, onDelete, onClone, onEdit,
    showFilial = true, selected, onSelect, onSelectStart, suppressOpen, disabledForMerge,
    canDeleteServer = true,
  } = props;

  const handleRowClick = useCallback(() => {
    if (suppressOpen?.()) return;
    onOpen(sheet.id);
  }, [onOpen, sheet.id, suppressOpen]);
  const stopRowClick   = useCallback((e: React.MouseEvent) => e.stopPropagation(), []);
  const handleDelete   = useCallback(() => onDelete?.(sheet.id), [onDelete, sheet.id]);
  const handleClone    = useCallback(() => onClone?.(sheet.id), [onClone, sheet.id]);
  const handleEdit     = useCallback(() => onEdit?.(sheet.id), [onEdit, sheet.id]);
  const handleCheck    = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    onSelect?.(sheet.id, e.target.checked);
  }, [onSelect, sheet.id]);

  const handleRowMouseDown = useCallback((e: React.MouseEvent) => {
    if (!onSelectStart || e.button !== 0) return;
    const target = e.target as HTMLElement;
    // Кнопки/ссылки в строке не должны запускать выделение.
    if (target.closest('button, a')) return;
    onSelectStart(sheet.id, e);
  }, [onSelectStart, sheet.id]);

  const total = sheet.activeCount + sheet.fixedCount;
  const fixedPct = total > 0 ? Math.round(sheet.fixedCount / total * 100) : 0;

  return (
    <TableRow
      className={`${cls.row} ${disabledForMerge ? cls.rowDisabled : ''}`}
      data-sheet-id={onSelect ? sheet.id : undefined}
      data-sheet-disabled={disabledForMerge ? '1' : undefined}
      onClick={handleRowClick}
      onMouseDown={onSelectStart ? handleRowMouseDown : undefined}
    >
      {onSelect && (
        <TableTd className={cls.cellCheck} onClick={stopRowClick}>
          <span className={cls.checkWrap}>
            <Checkbox
              checked={!!selected}
              onChange={handleCheck}
              disabled={disabledForMerge}
            />
          </span>
        </TableTd>
      )}
      <TableTd className={cls.cell}>
        {index}
        {sheet.status === 'pending' && (
          <span className={cls.offlineIcon} title="Ожидает синхронизации">
            <IconOffline />
          </span>
        )}
      </TableTd>
      {showFilial && <TableTd className={cls.cell}>{sheet.filialName}</TableTd>}
      <TableTd className={cls.cell}>{sheet.voltageName}</TableTd>
      <TableTd className={`${cls.cell} ${cls.lineCell}`}>{sheet.lineName}</TableTd>
      <TableTd className={cls.cell}>{formatDate(sheet.createdDate)}</TableTd>
      <TableTd className={`${cls.cell} ${cls.inspectorCell}`} title={sheet.inspectors || sheet.createdBy}>
        {sheet.inspectors || sheet.createdBy}
      </TableTd>
      <TableTd className={`${cls.cell} ${cls.mergedCell}`} title={sheet.mergedBy ?? undefined}>
        {sheet.mergedBy ?? ''}
      </TableTd>
      <TableTd className={cls.cell}>
        <Badge variant={sheet.activeCount > 0 ? 'danger' : 'neutral'}>
          {sheet.activeCount}
        </Badge>
      </TableTd>
      <TableTd className={cls.cell}>
        <div className={cls.fixedCell}>
          <Badge variant={sheet.fixedCount > 0 ? 'success' : 'neutral'}>
            {sheet.fixedCount}
          </Badge>
          {total > 0 && (
            <div className={cls.progressTrack}>
              <div
                className={cls.progressBar}
                style={{ '--progress-value': `${fixedPct}%` } as React.CSSProperties}
              />
            </div>
          )}
        </div>
      </TableTd>
      <TableTd className={cls.cell} onClick={stopRowClick}>
        <Dropdown
          placement="bottom-end"
          trigger={({ open, toggle }) => (
            <Button
              variant='ghost'
              size='m'
              square
              className={cls.menuBtn}
              onClick={toggle}
              aria-haspopup='menu'
              aria-expanded={open}
              aria-label='Действия с листком'
            >
              &#8942;
            </Button>
          )}
        >
          {({ close }) => (
            <>
              <button type="button" role="menuitem" className={cls.menuItem}
                onClick={() => { close(); onOpen(sheet.id); }}>
                Открыть
              </button>
              {onEdit && sheet.status !== 'pending' && (
                <button type="button" role="menuitem" className={cls.menuItem}
                  onClick={() => { close(); handleEdit(); }}>
                  Редактировать
                </button>
              )}
              {onClone && sheet.status !== 'pending' && (
                <button type="button" role="menuitem" className={cls.menuItem}
                  onClick={() => { close(); handleClone(); }}>
                  Копировать
                </button>
              )}
              {onDelete && (sheet.status === 'pending' || canDeleteServer) && (
                <button type="button" role="menuitem"
                  className={`${cls.menuItem} ${cls.menuItemDanger}`}
                  onClick={() => { close(); handleDelete(); }}>
                  <IconTrash size={13} /> Удалить
                </button>
              )}
            </>
          )}
        </Dropdown>
      </TableTd>
    </TableRow>
  );
});

SheetCard.displayName = 'SheetCard';
