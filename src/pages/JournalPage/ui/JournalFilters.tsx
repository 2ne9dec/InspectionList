import { memo, useMemo, useRef, useState } from 'react';
import type { Line, Voltage, Element, DefectType } from '@/entities/InspectionLine';
import { SelectMenu } from '@/shared/ui';
import { DefectTreePopup } from '@/features/AddDefect';
import { capitalizeFirst as cap } from '@/shared/lib/helpers';
import type { StatusFilter } from '../model/useJournalFilters';
import cls from './JournalPage.module.scss';

function openPicker(e: React.MouseEvent<HTMLInputElement>) {
  (e.currentTarget as HTMLInputElement & { showPicker?: () => void }).showPicker?.();
}

const STATUS_OPTIONS = [
  { value: 'all',    label: 'Все статусы' },
  { value: 'active', label: 'Обнаруженные' },
  { value: 'fixed',  label: 'Устранённые' },
];

interface JournalFiltersProps {
  voltages:      Voltage[];
  filteredLines: Line[];
  elements:      ReadonlyArray<Element>;
  defectTypes:   ReadonlyArray<DefectType>;
  statusFilter:    StatusFilter;
  voltageFilter:   string;
  lineFilter:      string;
  selectedDefectTypeIds: ReadonlySet<number>;
  inspectorFilter: string;
  poleFilter:      string;
  dateFrom:        string;
  dateTo:          string;
  hasFilters:      boolean;
  setStatusFilter:          (v: StatusFilter) => void;
  handleVoltageChange:      (v: string) => void;
  setLineFilter:            (v: string) => void;
  setSelectedDefectTypeIds: (ids: Set<number>) => void;
  setInspectorFilter:       (v: string) => void;
  setPoleFilter:            (v: string) => void;
  setDateFrom:              (v: string) => void;
  setDateTo:                (v: string) => void;
  resetFilters:             () => void;
}

export const JournalFilters = memo(({
  voltages, filteredLines, elements, defectTypes,
  statusFilter, voltageFilter, lineFilter, selectedDefectTypeIds,
  inspectorFilter, poleFilter, dateFrom, dateTo, hasFilters,
  setStatusFilter, handleVoltageChange, setLineFilter, setSelectedDefectTypeIds,
  setInspectorFilter, setPoleFilter, setDateFrom, setDateTo, resetFilters,
}: JournalFiltersProps) => {
  const [popupOpen, setPopupOpen] = useState(false);
  const [anchor, setAnchor]       = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);

  const voltageOptions = useMemo(() => [
    { value: '', label: 'Все напряжения' },
    ...voltages.map((v) => ({ value: String(v.id), label: v.name })),
  ], [voltages]);

  const lineOptions = useMemo(() => [
    { value: '', label: 'Все линии' },
    ...filteredLines.map((l) => ({ value: String(l.id), label: l.name })),
  ], [filteredLines]);

  // Подпись на кнопке
  const buttonLabel = useMemo(() => {
    const count = selectedDefectTypeIds.size;
    if (count === 0) return 'Элемент / дефект…';
    if (count === 1) {
      const [id] = selectedDefectTypeIds;
      const dt = defectTypes.find((d) => d.id === id);
      if (!dt) return 'Элемент / дефект…';
      const el = elements.find((e) => e.id === dt.elementId);
      return el ? `${cap(el.name)}: ${cap(dt.name)}` : cap(dt.name);
    }
    return `Дефекты: ${count}`;
  }, [selectedDefectTypeIds, defectTypes, elements]);

  const handleOpenPopup = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setAnchor({ top: rect.bottom + 4, left: rect.left });
    setPopupOpen(true);
  };

  return (
    <div className={cls.filterBar}>
      <SelectMenu
        options={STATUS_OPTIONS}
        value={statusFilter}
        onChange={(v) => setStatusFilter(v as StatusFilter)}
        className={cls.filterSelect}
      />

      <SelectMenu
        options={voltageOptions}
        value={voltageFilter}
        onChange={handleVoltageChange}
        className={cls.filterSelect}
      />

      <SelectMenu
        options={lineOptions}
        value={lineFilter}
        onChange={setLineFilter}
        className={cls.filterSelectLine}
      />

      <button
        ref={btnRef}
        type="button"
        className={`${cls.defectFilterBtn}${selectedDefectTypeIds.size > 0 ? ' ' + cls.defectFilterBtnActive : ''}`}
        onClick={handleOpenPopup}
      >
        <span className={cls.defectFilterLabel}>{buttonLabel}</span>
        {selectedDefectTypeIds.size > 0 ? (
          <span
            className={cls.defectFilterClear}
            role="button"
            aria-label="Сбросить"
            onClick={(e) => { e.stopPropagation(); setSelectedDefectTypeIds(new Set()); }}
          >×</span>
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
          selectedIds={selectedDefectTypeIds}
          onSelectionChange={(ids) => setSelectedDefectTypeIds(new Set(ids))}
        />
      )}

      <input
        id='journal-inspector-filter'
        name='journal-inspector-filter'
        className={cls.textInput}
        type='text'
        placeholder='Обнаружил…'
        value={inspectorFilter}
        onChange={(e) => setInspectorFilter(e.target.value)}
        autoComplete='off'
      />

      <input
        id='journal-pole-filter'
        name='journal-pole-filter'
        className={cls.textInput}
        type='text'
        placeholder='Опора / пролёт…'
        value={poleFilter}
        onChange={(e) => setPoleFilter(e.target.value)}
        autoComplete='off'
      />

      <div className={cls.dateGroup}>
        <input
          id='journal-date-from'
          name='journal-date-from'
          className={cls.dateInput}
          type='date'
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          onClick={openPicker}
          title='Дата от'
        />
        <span className={cls.dateSep}>—</span>
        <input
          id='journal-date-to'
          name='journal-date-to'
          className={cls.dateInput}
          type='date'
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          onClick={openPicker}
          title='Дата до'
        />
      </div>

      <button
        className={`${cls.resetBtn}${hasFilters ? '' : ' ' + cls.resetBtnHidden}`}
        onClick={resetFilters}
      >
        Сбросить
      </button>
    </div>
  );
});

JournalFilters.displayName = 'JournalFilters';
