import { memo, useMemo } from 'react';
import type { Line, Voltage, Element, DefectType } from '@/entities/InspectionLine';
import { Input, SelectMenu } from '@/shared/ui';
import type { StatusFilter } from '../model/useJournalFilters';
import { DefectTypeFilter } from './DefectTypeFilter';
import cls from './JournalFilters.module.scss';

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
  const voltageOptions = useMemo(() => [
    { value: '', label: 'Все напряжения' },
    ...voltages.map((v) => ({ value: String(v.id), label: v.name })),
  ], [voltages]);

  const lineOptions = useMemo(() => [
    { value: '', label: 'Все линии' },
    ...filteredLines.map((l) => ({ value: String(l.id), label: l.name })),
  ], [filteredLines]);

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

      <DefectTypeFilter
        elements={elements}
        defectTypes={defectTypes}
        selectedIds={selectedDefectTypeIds}
        onChange={setSelectedDefectTypeIds}
      />

      <Input
        id='journal-inspector-filter'
        name='journal-inspector-filter'
        className={cls.textInput}
        type='text'
        placeholder='Обнаружил…'
        value={inspectorFilter}
        onChange={setInspectorFilter}
        autoComplete='off'
      />

      <div className={cls.poleField}>
        <Input
          id='journal-pole-filter'
          name='journal-pole-filter'
          className={cls.textInput}
          type='text'
          placeholder='Опора / пролёт…'
          value={poleFilter}
          onChange={setPoleFilter}
          autoComplete='off'
        />
      </div>

      <div className={cls.dateGroup}>
        <Input
          id='journal-date-from'
          name='journal-date-from'
          className={cls.dateInput}
          type='date'
          value={dateFrom}
          onChange={setDateFrom}
          title='Дата от'
        />
        <span className={cls.dateSep}>—</span>
        <Input
          id='journal-date-to'
          name='journal-date-to'
          className={cls.dateInput}
          type='date'
          value={dateTo}
          onChange={setDateTo}
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
