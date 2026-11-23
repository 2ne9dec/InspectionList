import { memo, useMemo, useState } from 'react';
import type { DefectType, Element } from '@/entities/InspectionLine';
import { DefectTreePopup } from '@/features/AddDefect';
import { capitalizeFirst as cap } from '@/shared/lib/helpers';
import cls from './JournalFilters.module.scss';

interface DefectTypeFilterProps {
  elements: ReadonlyArray<Element>;
  defectTypes: ReadonlyArray<DefectType>;
  selectedIds: ReadonlySet<number>;
  onChange: (ids: Set<number>) => void;
}

/** Кнопка и поповер выбора элемента/вида дефекта в фильтрах журнала. */
export const DefectTypeFilter = memo(({
  elements,
  defectTypes,
  selectedIds,
  onChange,
}: DefectTypeFilterProps) => {
  const [popupOpen, setPopupOpen] = useState(false);
  const [anchor, setAnchor] = useState({ top: 0, left: 0 });

  const buttonLabel = useMemo(() => {
    const count = selectedIds.size;
    if (count === 0) return 'Элемент / дефект…';
    if (count === 1) {
      const [id] = selectedIds;
      const dt = defectTypes.find((d) => d.id === id);
      if (!dt) return 'Элемент / дефект…';
      const el = elements.find((e) => e.id === dt.elementId);
      return el ? `${cap(el.name)}: ${cap(dt.name)}` : cap(dt.name);
    }
    return `Дефекты: ${count}`;
  }, [selectedIds, defectTypes, elements]);

  const handleOpenPopup = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setAnchor({ top: rect.bottom + 4, left: rect.left });
    setPopupOpen(true);
  };

  return (
    <>
      <button
        type='button'
        className={`${cls.defectFilterBtn}${selectedIds.size > 0 ? ' ' + cls.defectFilterBtnActive : ''}`}
        onClick={handleOpenPopup}
      >
        <span className={cls.defectFilterLabel}>{buttonLabel}</span>
        {selectedIds.size > 0 ? (
          <span
            className={cls.defectFilterClear}
            role='button'
            aria-label='Сбросить'
            onClick={(e) => { e.stopPropagation(); onChange(new Set()); }}
          >
            ×
          </span>
        ) : (
          <span className={cls.defectFilterChevron} aria-hidden>▾</span>
        )}
      </button>

      {popupOpen && (
        <DefectTreePopup
          elements={elements}
          defectTypes={defectTypes}
          anchor={anchor}
          onSelect={() => {}}
          onClose={() => setPopupOpen(false)}
          multiSelect
          selectedIds={selectedIds}
          onSelectionChange={(ids) => onChange(new Set(ids))}
        />
      )}
    </>
  );
});

DefectTypeFilter.displayName = 'DefectTypeFilter';
