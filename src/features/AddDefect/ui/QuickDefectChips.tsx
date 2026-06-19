import { memo } from 'react';
import type { DefectType, Element } from '@/entities/InspectionLine';
import cls from './AddDefectBar.module.scss';

interface QuickDefectChipsProps {
  topDefects:      DefectType[];
  elements:        Element[];
  selectedDefectId: number | null;
  onSelect:        (defect: DefectType) => void;
}

export const QuickDefectChips = memo(({
  topDefects,
  elements,
  selectedDefectId,
  onSelect,
}: QuickDefectChipsProps) => {
  if (topDefects.length === 0) return null;

  return (
    <div className={cls.quickChips}>
      <span className={cls.quickLabel}>Быстро:</span>
      {topDefects.map((dt) => {
        const el = elements.find((e) => e.id === dt.elementId);
        const active = selectedDefectId === dt.id;
        return (
          <button
            key={dt.id}
            type='button'
            className={`${cls.chip} ${active ? cls.chipActive : ''}`}
            onClick={() => onSelect(dt)}
            title={`${el?.name ?? ''}: ${dt.name}`}
          >
            {el ? `${el.name.slice(0, 6)}…` : ''}{' '}
            {dt.name.slice(0, 14)}{dt.name.length > 14 ? '…' : ''}
          </button>
        );
      })}
    </div>
  );
});

QuickDefectChips.displayName = 'QuickDefectChips';
