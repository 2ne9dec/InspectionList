import { memo } from 'react';
import { ThFilter } from '@/shared/ui/ThFilter';
import { ThSort } from '@/shared/ui/ThSort';
import type { FilterOption } from '@/shared/ui/ThFilter';
import cls from './DefectTableHeader.module.scss';

interface DefectTableHeaderProps {
  sortDir: 'asc' | 'desc';
  onSortToggle: () => void;
  anyExpanded: boolean;
  isFixed: boolean;
  filterElementId: string;
  filterDefectTypeId: string;
  filterSeverity: string;
  elements: FilterOption[];
  defectTypes: FilterOption[];
  severityOptions: FilterOption[];
  onElementChange: (v: string) => void;
  onDefectTypeChange: (v: string) => void;
  onSeverityChange: (v: string) => void;
}

export const DefectTableHeader = memo((props: DefectTableHeaderProps) => {
  const {
    sortDir,
    onSortToggle,
    anyExpanded,
    isFixed,
    filterElementId,
    filterDefectTypeId,
    filterSeverity,
    elements,
    defectTypes,
    severityOptions,
    onElementChange,
    onDefectTypeChange,
    onSeverityChange,
  } = props;

  return (
    <thead>
      <tr>
        {/* Порядковый номер */}
        <th className={cls.th} style={{ width: 48 }}>
          №
        </th>

        {/* Опора или Пролёты */}
        <ThSort label='Опора / Пролёты' dir={sortDir} onClick={onSortToggle} width='clamp(100px, 10vw, 140px)' />

        <ThFilter
          label='Элемент'
          value={filterElementId}
          options={elements}
          onChange={onElementChange}
          width={anyExpanded ? 'clamp(140px, 14vw, 200px)' : 'auto'}
        />

        {anyExpanded && (
          <>
            <ThFilter
              label='Дефект'
              value={filterDefectTypeId}
              options={defectTypes}
              onChange={onDefectTypeChange}
              width='auto'
            />
            <ThFilter
              label='Серьёзность'
              value={filterSeverity}
              options={severityOptions}
              onChange={onSeverityChange}
              width='clamp(110px, 11vw, 140px)'
            />
            <th className={cls.th} style={{ width: 'clamp(90px, 10vw, 120px)' }}>
              Дата обн.
            </th>
            <th className={cls.th} style={{ width: 'clamp(110px, 12vw, 160px)' }}>
              Обнаружил
            </th>
            {isFixed && (
              <>
                <th className={cls.th} style={{ width: 'clamp(90px, 10vw, 120px)' }}>
                  Дата устр.
                </th>
                <th className={cls.th} style={{ width: 'clamp(110px, 12vw, 160px)' }}>
                  Устранил
                </th>
              </>
            )}
          </>
        )}

        <th className={cls.th} style={{ width: 'clamp(90px, 9vw, 130px)' }}>
          Кол-во
        </th>
        <th className={cls.th} style={{ width: 'clamp(50px, 5vw, 70px)' }} />
      </tr>
    </thead>
  );
});
DefectTableHeader.displayName = 'DefectTableHeader';
