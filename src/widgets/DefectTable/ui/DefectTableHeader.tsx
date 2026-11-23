import { memo } from 'react';
import { ThFilter } from '@/shared/ui/ThFilter';
import { ThSort } from '@/shared/ui/ThSort';
import type { FilterOption } from '@/shared/ui/ThFilter';
import cls from './DefectTableHeader.module.scss';
import { TableHead, TableRow, TableTh } from '@/shared/ui';

interface DefectTableHeaderProps {
  sortDir: 'asc' | 'desc';
  onSortToggle: () => void;
  isFixed: boolean;
  filterElementId: string;
  filterDefectTypeId: string;
  elements: FilterOption[];
  defectTypes: FilterOption[];
  onElementChange: (v: string) => void;
  onDefectTypeChange: (v: string) => void;
}

export const DefectTableHeader = memo((props: DefectTableHeaderProps) => {
  const {
    sortDir,
    onSortToggle,
    isFixed,
    filterElementId,
    filterDefectTypeId,
    elements,
    defectTypes,
    onElementChange,
    onDefectTypeChange,
  } = props;

  return (
    <TableHead>
      <TableRow>
        {/* Порядковый номер */}
        <TableTh className={`${cls.th} ${cls.colIndex}`}>
          №
        </TableTh>

        {/* Опора или Пролёты */}
        <ThSort label='Опора / Пролёты' dir={sortDir} onClick={onSortToggle} width='var(--table-col-pole)' />

        <ThFilter
          label='Элемент'
          value={filterElementId}
          options={elements}
          onChange={onElementChange}
        />

        {/* Колонки детализации всегда на месте — раскрытие не меняет ширины */}
        <ThFilter
          label='Дефект'
          value={filterDefectTypeId}
          options={defectTypes}
          onChange={onDefectTypeChange}
          width='var(--table-col-defect)'
        />
        <TableTh className={`${cls.th} ${cls.colDate}`}>
          Дата обн.
        </TableTh>
        <TableTh className={`${cls.th} ${cls.colPerson}`}>
          Обнаружил
        </TableTh>
        <TableTh className={`${cls.th} ${cls.colNote}`}>
          Примечание
        </TableTh>
        {isFixed && (
          <>
            <TableTh className={`${cls.th} ${cls.colDate}`}>
              Дата устр.
            </TableTh>
            <TableTh className={`${cls.th} ${cls.colPerson}`}>
              Устранил
            </TableTh>
          </>
        )}

        <TableTh className={`${cls.th} ${cls.colCount}`}>
          Кол-во
        </TableTh>
        <TableTh className={`${cls.th} ${cls.colActions}`} />
      </TableRow>
    </TableHead>
  );
});
DefectTableHeader.displayName = 'DefectTableHeader';
