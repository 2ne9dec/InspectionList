import { memo } from 'react';
import { Button } from '@/shared/ui';
import { DateRangeFilter } from './DateRangeFilter';
import cls from './SheetsList.module.scss';

interface SheetsListFilterBarProps {
  dateFrom: string;
  dateTo: string;
  onDateRangeChange: (value: { from: string; to: string }) => void;
  mergeCount: number;
  mergeLineName: string;
  onOpenMerge: () => void;
}

/** Фильтр по датам и подсказка/кнопка объединения листков. */
export const SheetsListFilterBar = memo(({
  dateFrom,
  dateTo,
  onDateRangeChange,
  mergeCount,
  mergeLineName,
  onOpenMerge,
}: SheetsListFilterBarProps) => (
  <div className={cls.filterBar}>
    <DateRangeFilter dateFrom={dateFrom} dateTo={dateTo} onChange={onDateRangeChange} />
    {mergeCount >= 2 && (
      <Button variant='primary' size='s' onClick={onOpenMerge} className={cls.mergeBtn}>
        Объединить {mergeCount} листка
      </Button>
    )}
    {mergeCount === 1 && (
      <span className={`${cls.filterHint} ${cls.mergeHint}`}>
        Выберите ещё листок линии «{mergeLineName}» для объединения
      </span>
    )}
  </div>
));

SheetsListFilterBar.displayName = 'SheetsListFilterBar';
