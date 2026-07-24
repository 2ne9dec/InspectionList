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
  elements: FilterOption[];
  defectTypes: FilterOption[];
  onElementChange: (v: string) => void;
  onDefectTypeChange: (v: string) => void;
}

export const DefectTableHeader = memo((props: DefectTableHeaderProps) => {
  const {
    sortDir,
    onSortToggle,
    anyExpanded,
    isFixed,
    filterElementId,
    filterDefectTypeId,
    elements,
    defectTypes,
    onElementChange,
    onDefectTypeChange,
  } = props;

  return (
    <thead>
      <tr>
        {/* Порядковый номер */}
        <th className={cls.th} style={{ width: 48 }}>
          №
        </th>

        {/* Опора или Пролёты */}
        <ThSort label='Опора / Пролёты' dir={sortDir} onClick={onSortToggle} width='clamp(130px, 13vw, 170px)' />

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
            <th className={cls.th} style={{ width: 'clamp(90px, 10vw, 120px)' }}>
              Дата обн.
            </th>
            <th className={cls.th} style={{ width: 'clamp(110px, 12vw, 160px)' }}>
              Обнаружил
            </th>
            <th className={cls.th} style={{ width: 'clamp(110px, 12vw, 200px)' }}>
              Примечание
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
