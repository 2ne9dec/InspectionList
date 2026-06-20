import { memo } from 'react';
import type { JournalRow } from '../model/useJournalFilters';
import { formatDate } from '@/shared/lib/helpers';
import cls from './JournalPage.module.scss';

interface JournalTableProps {
  rows:       JournalRow[];
  selectedIds: Set<number>;
  allSelected: boolean;
  onSelectAll: (checked: boolean) => void;
  onSelect:    (id: number, checked: boolean) => void;
  onEditRow:   (id: number) => void;
}

/** Одна строка таблицы, мемоизирована по id + выделению */
const Row = memo(({
  row,
  index,
  selected,
  onSelect,
  onEdit,
}: {
  row:      JournalRow;
  index:    number;
  selected: boolean;
  onSelect: (id: number, checked: boolean) => void;
  onEdit:   (id: number) => void;
}) => {
  const { d, line, voltage, location } = row;
  return (
    <tr className={[d.isFixed ? cls.rowFixed : '', selected ? cls.rowSelected : ''].join(' ').trim()}>
      <td className={cls.tdCheck} onClick={(e) => e.stopPropagation()}>
        <input
          type='checkbox'
          checked={selected}
          disabled={!!d.isFixed}
          onChange={(e) => onSelect(d.id, e.target.checked)}
        />
      </td>
      <td className={cls.tdNum}>{index + 1}</td>
      <td className={cls.tdNowrap}>{voltage?.name ?? '—'}</td>
      <td className={cls.tdLine}>{line?.name ?? '—'}</td>
      <td className={cls.tdDate}>{formatDate(d.dateFound)}</td>
      <td className={cls.tdNowrap}>{d.inspectorFind}</td>
      <td className={cls.tdLocation}>
        <div className={cls.clamp} title={location}>{location}</div>
      </td>
      <td
        className={`${cls.tdConclusion} ${cls.editable}`}
        onClick={() => onEdit(d.id)}
      >
        {d.masterConclusion
          ? <div className={cls.clamp} title={d.masterConclusion}>{d.masterConclusion}</div>
          : <span className={cls.editHint}>—</span>}
      </td>
      <td
        className={`${cls.tdDate} ${cls.editable}`}
        onClick={() => onEdit(d.id)}
      >
        {(d.resolutionDeadline || d.masterName) ? (
          <>
            {formatDate(d.resolutionDeadline)}
            {d.masterName && <div className={cls.signed}>✍ {d.masterName}</div>}
          </>
        ) : <span className={cls.editHint}>—</span>}
      </td>
      <td
        className={`${cls.tdDate} ${cls.editable}`}
        onClick={() => onEdit(d.id)}
      >
        {(d.dateFixed || d.fixWorkVolume) ? (
          <>
            {formatDate(d.dateFixed)}
            {d.fixWorkVolume && <div className={cls.clamp} title={d.fixWorkVolume}>{d.fixWorkVolume}</div>}
          </>
        ) : <span className={cls.editHint}>—</span>}
      </td>
      <td className={cls.editable} onClick={() => onEdit(d.id)}>
        {d.inspectorFix
          ? <div className={cls.clamp} title={d.inspectorFix}>{d.inspectorFix}</div>
          : <span className={cls.editHint}>—</span>}
      </td>
    </tr>
  );
});
Row.displayName = 'JournalTableRow';

export const JournalTable = memo(({
  rows,
  selectedIds,
  allSelected,
  onSelectAll,
  onSelect,
  onEditRow,
}: JournalTableProps) => (
  <div className={cls.tableWrap}>
    <table className={cls.table}>
      <thead>
        <tr>
          <th rowSpan={2} className={cls.thCheck}>
            <input
              type='checkbox'
              checked={allSelected}
              onChange={(e) => onSelectAll(e.target.checked)}
              aria-label='Выбрать все'
            />
          </th>
          <th rowSpan={2} className={cls.thNum}>№</th>
          <th rowSpan={2}>Класс напряжения</th>
          <th rowSpan={2}>Линия</th>
          <th rowSpan={2}>
            Дата<br/>обнаружения
          </th>
          <th rowSpan={2}>
            Ф.И.О.<br/>обнаружившего
          </th>
          <th rowSpan={2} className={cls.thLocation}>
            Место обнаружения неисправности
            <span className={cls.thSub}>(опора/пролёт / фаза / элемент: дефект)</span>
          </th>
          <th colSpan={2} className={cls.thGroup}>
            Заключение мастера по устранению
          </th>
          <th colSpan={2} className={cls.thGroup}>
            Информация об устранении неисправностей
          </th>
        </tr>
        <tr>
          <th>Мероприятия по устранению</th>
          <th>Срок устранения, Ф.И.О.</th>
          <th>Дата устранения, объём работ</th>
          <th>Ф.И.О. производителя работ</th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={11} className={cls.empty}>
              Нет данных по выбранным фильтрам
            </td>
          </tr>
        ) : rows.map((row, i) => (
          <Row
            key={row.d.id}
            row={row}
            index={i}
            selected={selectedIds.has(row.d.id)}
            onSelect={onSelect}
            onEdit={onEditRow}
          />
        ))}
      </tbody>
    </table>
  </div>
));

JournalTable.displayName = 'JournalTable';
