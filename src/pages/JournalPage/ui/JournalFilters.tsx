import { memo, useMemo } from 'react';
import type { Line, Voltage } from '@/entities/InspectionLine';
import { SelectMenu } from '@/shared/ui';
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
  voltages:     Voltage[];
  filteredLines: Line[];
  statusFilter:    StatusFilter;
  voltageFilter:   string;
  lineFilter:      string;
  defectFilter:    string;
  inspectorFilter: string;
  dateFrom:        string;
  dateTo:          string;
  hasFilters:      boolean;
  setStatusFilter:    (v: StatusFilter) => void;
  handleVoltageChange: (v: string) => void;
  setLineFilter:      (v: string) => void;
  setDefectFilter:    (v: string) => void;
  setInspectorFilter: (v: string) => void;
  setDateFrom:        (v: string) => void;
  setDateTo:          (v: string) => void;
  resetFilters:       () => void;
}

export const JournalFilters = memo(({
  voltages,
  filteredLines,
  statusFilter,
  voltageFilter,
  lineFilter,
  defectFilter,
  inspectorFilter,
  dateFrom,
  dateTo,
  hasFilters,
  setStatusFilter,
  handleVoltageChange,
  setLineFilter,
  setDefectFilter,
  setInspectorFilter,
  setDateFrom,
  setDateTo,
  resetFilters,
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

      <input
        id='journal-defect-filter'
        name='journal-defect-filter'
        className={cls.textInput}
        type='text'
        placeholder='Элемент / дефект…'
        value={defectFilter}
        onChange={(e) => setDefectFilter(e.target.value)}
        autoComplete='off'
      />

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
        className={`${cls.resetBtn}${hasFilters ? '' : ` ${cls.resetBtnHidden}`}`}
        onClick={resetFilters}
      >
        Сбросить
      </button>
    </div>
  );
});

JournalFilters.displayName = 'JournalFilters';
