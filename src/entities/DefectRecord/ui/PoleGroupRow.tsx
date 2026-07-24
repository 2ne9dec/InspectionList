import { memo, useMemo } from 'react';
import { formatDate } from '@/shared/lib/helpers/formatDate';
import { KebabMenu } from '@/shared/ui/KebabMenu';
import { formatLocationLabel, locationKeyType } from '../lib/locationKey';
import type { DefectRecordFull } from '../model/types';
import cls from './PoleGroupRow.module.scss';

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
}

const MAX_CHIPS = 3;
const NO_DEFECT_ELEMENT = 'Дефекты отсутствуют';

interface SubGroup {
  key: string;
  ids: number[];
  first: DefectRecordFull;
  phases: string;
  phaseItems: { id: number; name: string }[];
  insulatorCount: number | null;
  garlandNumber: number | null;
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
    onRowClick,
    defectStartIndex = 0,
  } = props;

  const locationLabel = formatLocationLabel(locationKey);
  const span = locationKeyType(locationKey) === 'span';

  const uniqueElements = useMemo(() => Array.from(new Set(records.map((r) => r.elementName))), [records]);
  const isNoDefectPole = useMemo(() => records.every((r) => r.elementName === NO_DEFECT_ELEMENT), [records]);

  const subGroups = useMemo<SubGroup[]>(() => {
    if (!isExpanded) return [];
    const map = new Map<string, SubGroup>();
    for (const r of records) {
      // Каждая уникальная комбинация (элемент + дефект + фаза + кол-во изол.) — отдельная строка.
      // Это позволяет корректно открывать боковую панель для конкретной записи.
      const phaseKey    = r.phaseId        != null ? String(r.phaseId)        : 'null';
      const insulatorKey = r.insulatorCount != null ? String(r.insulatorCount) : 'null';
      const garlandKey  = r.garlandNumber  != null ? String(r.garlandNumber)  : 'null';
      const key = `${r.id}||${r.elementName}||${r.defectName}||${phaseKey}||${insulatorKey}||${garlandKey}`;
      const existing = map.get(key);
      if (existing) {
        existing.ids.push(r.id);
      } else {
        map.set(key, {
          key,
          ids: [r.id],
          first: r,
          phases: '',
          phaseItems: r.phaseName && r.phaseId !== null ? [{ id: r.phaseId, name: r.phaseName }] : [],
          insulatorCount: r.insulatorCount ?? null,
          garlandNumber:  r.garlandNumber  ?? null,
        });
      }
    }
    const groups = Array.from(map.values());
    // Сорт: по порядку первого добавления (мин id), фазы внутри — алфавитно
    const firstIdByType = new Map<string, number>();
    for (const g of groups) {
      const ek = `${g.first.elementName}||${g.first.defectName}`;
      const minId = Math.min(...g.ids);
      if (!firstIdByType.has(ek) || firstIdByType.get(ek)! > minId) firstIdByType.set(ek, minId);
    }
    groups.sort((a, b) => {
      const ekA = `${a.first.elementName}||${a.first.defectName}`;
      const ekB = `${b.first.elementName}||${b.first.defectName}`;
      const fA = firstIdByType.get(ekA) ?? 0;
      const fB = firstIdByType.get(ekB) ?? 0;
      if (fA !== fB) return fA - fB;
      return (a.first.phaseName ?? '').localeCompare(b.first.phaseName ?? '');
    });
    for (const g of groups) {
      g.phaseItems.sort((a, b) => a.id - b.id);
      g.phases = g.phaseItems.map((p) => p.name).join(', ');
    }
    return groups;
  }, [isExpanded, records]);

  // +1 за колонку №, +1 за колонку Опора/Пролёты
  const middleEmptyCells = anyExpanded ? (isFixed ? 6 : 4) : 0;

  const groupKebabItems = useMemo(() => {
    const items = [];
    if (!isFixed && !isNoDefectPole) {
      items.push({ id: 'fix', label: 'Устранить все', onClick: () => onFix(locationKey) });
    }
    items.push({ id: 'copy', label: 'Копировать', onClick: () => onCopy(locationKey) });
    items.push({
      id: 'delete',
      label: 'Удалить все',
      danger: true,
      onClick: () => onDeleteAll(records.map((r) => r.id)),
    });
    return items;
  }, [isFixed, isNoDefectPole, locationKey, onFix, onCopy, onDeleteAll, records]);

  return (
    <>
      <tr className={`${cls.groupRow} ${isExpanded ? cls.open : ''}`} onClick={() => onToggle(locationKey)} data-pole-key={locationKey}>
        {/* Порядковый номер */}
        <td className={`${cls.cell} ${cls.cellIndex}`}>
          {index}
        </td>

        {/* Опора / Пролёты */}
        <td className={cls.cell}>
          <span className={cls.expandIcon} aria-hidden>
            {isExpanded ? '▼' : '▶'}
          </span>
          <strong className={cls.poleNum}>
            {span && (
              <span className={cls.spanLabel}>пр.</span>
            )}
            {locationLabel}
          </strong>
        </td>

        {/* Элементы (chips) */}
        <td className={cls.cell}>
          <span className={cls.chipList}>
            {!isExpanded &&
              uniqueElements.slice(0, MAX_CHIPS).map((elName) => {
                const isNoDefect = elName === NO_DEFECT_ELEMENT;
                return (
                  <span
                    key={elName}
                    className={cls.chip}
                  >
                    {!isNoDefect && <span className={cls.chipDot} />}
                    {elName}
                  </span>
                );
              })}
            {!isExpanded && uniqueElements.length > MAX_CHIPS && (
              <span className={cls.chipMore}>+{uniqueElements.length - MAX_CHIPS} ещё</span>
            )}
          </span>
        </td>

        {Array.from({ length: middleEmptyCells }).map((_, i) => (
          <td key={i} className={cls.cell} />
        ))}

        <td className={cls.cell}>
          <span
            className={cls.badge}
          >
            {isNoDefectPole ? '0' : records.length} деф.
          </span>
        </td>

        <td className={cls.cell} onClick={(e) => e.stopPropagation()}>
          <div className={cls.actions}>
            <KebabMenu items={groupKebabItems} ariaLabel='Действия' size='m' />
          </div>
        </td>
      </tr>

      {isExpanded &&
        subGroups.map((group, idx) => {
          const { first, ids, phases, insulatorCount, garlandNumber: grNum } = group;
          const isNoDefectRecord = first.elementName === NO_DEFECT_ELEMENT;
          const subKebabItems = [
            ...(!isFixed && !isNoDefectRecord
              ? [{ id: 'fix', label: 'Устранить', onClick: () => onFixOne(ids[0]) }]
              : []),
            { id: 'copy', label: 'Копировать', onClick: () => onCopy(locationKey) },
            {
              id: 'delete',
              label: 'Удалить',
              danger: true,
              onClick: () => (ids.length === 1 ? onDelete(ids[0]) : onDeleteAll(ids)),
            },
          ];

          return (
            <tr
              key={group.key}
              className={cls.subRow}
              onClick={onRowClick ? () => onRowClick(first) : undefined}
              style={onRowClick ? { cursor: 'pointer' } : undefined}
            >
              <td className={cls.subCell}>
                <span className={cls.subIdx}>{defectStartIndex + idx + 1}</span>
              </td>
              <td className={cls.subCell} />
              <td className={cls.subCell}>{first.elementName}</td>
              <td className={cls.subCell}>
                {first.defectName}
                {grNum != null && grNum > 0 && <span className={cls.phaseTag}>гирл. {grNum}</span>}
                {phases && <span className={cls.phaseTag}>{phases}</span>}
                {insulatorCount != null && insulatorCount > 0 && <span className={cls.phaseTag}>{insulatorCount} шт.</span>}
              </td>
              <td className={cls.subCell}>{formatDate(first.dateFound)}</td>
              <td className={cls.subCell}>{first.inspectorFind}</td>
              <td className={cls.subCellNote}>
                {first.notes
                  ? <span className={cls.noteCell} title={first.notes ?? undefined}>{first.notes}</span>
                  : <span className={cls.noteCellEmpty}>—</span>}
              </td>
              {isFixed && (
                <>
                  <td className={cls.subCell}>{first.dateFixed ? formatDate(first.dateFixed) : '—'}</td>
                  <td className={cls.subCell}>{first.inspectorFix ?? '—'}</td>
                </>
              )}
              <td className={cls.subCell} />
              <td className={cls.subCell}>
                <div className={cls.subActions}>
                  <KebabMenu items={subKebabItems} ariaLabel='Действия с дефектом' />
                </div>
              </td>
            </tr>
          );
        })}
    </>
  );
});

PoleGroupRow.displayName = 'PoleGroupRow';
