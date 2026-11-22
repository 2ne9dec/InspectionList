import { memo } from 'react';
import type { DefectRecordFull } from '@/entities/DefectRecord';
import { Checkbox, EmptyState } from '@/shared/ui';
import cls from './CopyDefectModal.module.scss';

interface CopyDefectListProps {
  defects: ReadonlyArray<DefectRecordFull>;
  selectedSet: ReadonlySet<number>;
  allSelected: boolean;
  locationLabel: string;
  locationPrefix: string;
  onToggle: (defectId: number) => void;
  onSelectAll: () => void;
  onClear: () => void;
}

/** Секция выбора дефектов-источников для копирования. */
export const CopyDefectList = memo(({
  defects,
  selectedSet,
  allSelected,
  locationLabel,
  locationPrefix,
  onToggle,
  onSelectAll,
  onClear,
}: CopyDefectListProps) => (
  <div className={cls.section}>
    <div className={cls.sectionHeader}>
      <p className={cls.sectionTitle}>Выберите дефекты для копирования:</p>
      <button
        type='button'
        className={cls.selectLink}
        onClick={allSelected ? onClear : onSelectAll}
      >
        {allSelected ? 'Снять все' : 'Выбрать все'}
      </button>
    </div>

    {defects.length === 0 ? (
      <EmptyState compact title={`Нет активных дефектов на ${locationPrefix} ${locationLabel}`} />
    ) : (
      <div className={cls.defectList}>
        {defects.map((d) => (
          <label key={d.id} className={cls.defectCheckRow}>
            <Checkbox checked={selectedSet.has(d.id)} onChange={() => onToggle(d.id)} />
            <span className={cls.elementLabel}>{d.elementName}</span>
            <span className={cls.defectLabel}>{d.defectName}</span>
            {d.phaseName && (
              <span className={cls.phaseTag}>{d.phaseName}</span>
            )}
          </label>
        ))}
      </div>
    )}
  </div>
));

CopyDefectList.displayName = 'CopyDefectList';
