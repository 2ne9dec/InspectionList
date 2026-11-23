import { memo } from 'react';
import type { JournalRow } from '../model/useJournalFilters';
import { formatDate } from '@/shared/lib/helpers';
import { Checkbox, TableRow, TableTd } from '@/shared/ui';
import cls from './JournalTable.module.scss';

interface JournalTableRowProps {
  row: JournalRow;
  index: number;
  selected: boolean;
  onSelect: (id: number, checked: boolean) => void;
  onEdit: (id: number) => void;
  /** Старт выделения протяжкой. */
  onSelectStart?: (id: number, e: React.MouseEvent) => void;
  readOnly?: boolean;
}

/** Одна строка журнала, мемоизирована по id + выделению. */
export const JournalTableRow = memo(({
  row,
  index,
  selected,
  onSelect,
  onEdit: onEditProp,
  onSelectStart,
  readOnly,
}: JournalTableRowProps) => {
  const { d, line, voltage, location } = row;
  const onEdit = readOnly ? () => {} : onEditProp;
  const editable = readOnly ? '' : cls.editable;
  const disabled = !!d.isFixed || !!readOnly;

  return (
    <TableRow
      className={[d.isFixed ? cls.rowFixed : '', selected ? cls.rowSelected : ''].join(' ').trim()}
      data-journal-id={onSelectStart ? d.id : undefined}
      data-journal-disabled={disabled ? '1' : undefined}
      onMouseDown={onSelectStart ? (e) => onSelectStart(d.id, e) : undefined}
    >
      <TableTd className={cls.tdCheck} onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={selected}
          disabled={!!d.isFixed || readOnly}
          onChange={(e) => onSelect(d.id, e.target.checked)}
        />
      </TableTd>
      <TableTd className={cls.tdNum}>{index + 1}</TableTd>
      <TableTd className={cls.tdNowrap}>{voltage?.name ?? '—'}</TableTd>
      <TableTd className={cls.tdLine}>{line?.name ?? '—'}</TableTd>
      <TableTd className={cls.tdDate}>{formatDate(d.dateFound)}</TableTd>
      <TableTd className={cls.tdNowrap} title={d.inspectorFind}>{d.inspectorFind}</TableTd>
      <TableTd className={cls.tdLocation}>
        <div className={cls.clamp} title={location}>{location}</div>
      </TableTd>
      <TableTd
        className={`${cls.tdConclusion} ${editable}`}
        onClick={() => onEdit(d.id)}
      >
        {d.masterConclusion
          ? <div className={cls.clamp} title={d.masterConclusion}>{d.masterConclusion}</div>
          : <span className={cls.editHint}>—</span>}
      </TableTd>
      <TableTd
        className={`${cls.tdDate} ${editable}`}
        onClick={() => onEdit(d.id)}
      >
        {(d.resolutionDeadline || d.masterName) ? (
          <>
            {formatDate(d.resolutionDeadline)}
            {d.masterName && <div className={cls.signed}>✍ {d.masterName}</div>}
          </>
        ) : <span className={cls.editHint}>—</span>}
      </TableTd>
      <TableTd
        className={`${cls.tdDate} ${editable}`}
        onClick={() => onEdit(d.id)}
      >
        {(d.dateFixed || d.fixWorkVolume) ? (
          <>
            {formatDate(d.dateFixed)}
            {d.fixWorkVolume && <div className={cls.clamp} title={d.fixWorkVolume}>{d.fixWorkVolume}</div>}
          </>
        ) : <span className={cls.editHint}>—</span>}
      </TableTd>
      <TableTd className={editable} onClick={() => onEdit(d.id)}>
        {d.inspectorFix
          ? <div className={cls.clamp} title={d.inspectorFix}>{d.inspectorFix}</div>
          : <span className={cls.editHint}>—</span>}
      </TableTd>
    </TableRow>
  );
});

JournalTableRow.displayName = 'JournalTableRow';
