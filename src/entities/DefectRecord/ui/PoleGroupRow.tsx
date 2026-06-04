import { memo, useMemo } from 'react';
import { formatDate } from '@/shared/lib/helpers/formatDate';
import { KebabMenu } from '@/shared/ui/KebabMenu';
import { SEVERITY_COLORS, SEVERITY_LABELS } from '@/shared/const/severity';
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
  } = props;

  const locationLabel = formatLocationLabel(locationKey);
  const span = locationKeyType(locationKey) === 'span';

  const maxSeverity = useMemo<'low' | 'medium' | 'critical'>(
    () =>
      records.reduce<'low' | 'medium' | 'critical'>((acc, r) => {
        if (r.severity === 'critical') return 'critical';
        if (r.severity === 'medium' && acc !== 'critical') return 'medium';
        return acc;
      }, 'low'),
    [records],
  );

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
      const key = `${r.elementName}||${r.defectName}||${phaseKey}||${insulatorKey}||${garlandKey}`;
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
      <tr className={`${cls.groupRow} ${isExpanded ? cls.open : ''}`} onClick={() => onToggle(locationKey)}>
        {/* Порядковый номер */}
        <td className={cls.cell} style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)' }}>
          {index}
        </td>

        {/* Опора / Пролёты */}
        <td className={cls.cell}>
          <span className={cls.expandIcon} aria-hidden>
            {isExpanded ? '▼' : '▶'}
          </span>
          <strong className={cls.poleNum}>
            {span && (
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)', marginRight: 4 }}>
                пр.
              </span>
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
                const sev = records
                  .filter((r) => r.elementName === elName)
                  .reduce<'low' | 'medium' | 'critical'>((acc, r) => {
                    if (r.severity === 'critical') return 'critical';
                    if (r.severity === 'medium' && acc !== 'critical') return 'medium';
                    return acc;
                  }, 'low');
                return (
                  <span
                    key={elName}
                    className={cls.chip}
                    style={{ borderColor: isNoDefect ? SEVERITY_COLORS['low'] : SEVERITY_COLORS[sev] }}
                  >
                    {!isNoDefect && <span className={cls.chipDot} style={{ background: SEVERITY_COLORS[sev] }} />}
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
            style={{ background: isNoDefectPole ? SEVERITY_COLORS['low'] : SEVERITY_COLORS[maxSeverity] }}
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
                <span className={cls.subIdx}>{idx + 1}</span>
              </td>
              <td className={cls.subCell} />
              <td className={cls.subCell}>{first.elementName}</td>
              <td className={cls.subCell}>
                {first.defectName}
                {grNum != null && <span className={cls.phaseTag}>гирл. {grNum}</span>}
                {phases && <span className={cls.phaseTag}>{phases}</span>}
                {insulatorCount != null && <span className={cls.phaseTag}>{insulatorCount} шт.</span>}
              </td>
              <td className={cls.subCell}>
                {!isNoDefectRecord && (
                  <span className={cls.badge} style={{ background: SEVERITY_COLORS[first.severity] }}>
                    {SEVERITY_LABELS[first.severity]}
                  </span>
                )}
              </td>
              <td className={cls.subCell}>{formatDate(first.dateFound)}</td>
              <td className={cls.subCell}>{first.inspectorFind}</td>
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
