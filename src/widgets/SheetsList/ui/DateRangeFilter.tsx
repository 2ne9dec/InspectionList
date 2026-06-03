import { memo, useRef, useState } from 'react';
import { Button, FormField, Input } from '@/shared/ui';
import { useEscape, useOutsideClick } from '@/shared/lib/hooks';
import { formatIsoDate } from '../lib/formatIsoDate';
import cls from './DateRangeFilter.module.scss';

export interface DateRangeFilterProps {
  dateFrom: string;
  dateTo: string;
  onChange: (range: { from: string; to: string }) => void;
}

/**
 * Кнопка-фильтр диапазона дат с выпадающим календарём.
 * Самодостаточен — управляет своим состоянием open/close.
 */
export const DateRangeFilter = memo(({ dateFrom, dateTo, onChange }: DateRangeFilterProps) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useOutsideClick(ref, () => setOpen(false), { enabled: open });
  useEscape(() => setOpen(false), { enabled: open });

  const hasFilter = !!(dateFrom || dateTo);
  const label = hasFilter
    ? `${formatIsoDate(dateFrom) || '…'} — ${formatIsoDate(dateTo) || '…'}`
    : 'Фильтр по дате';

  return (
    <div ref={ref} className={cls.wrap}>
      <button
        type="button"
        className={`${cls.btn} ${hasFilter ? cls.btnActive : ''}`}
        onClick={() => setOpen((p) => !p)}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        {label}
      </button>
      {hasFilter && (
        <button
          type="button"
          className={cls.clear}
          onClick={() => onChange({ from: '', to: '' })}
          aria-label="Сбросить диапазон дат"
        >
          ×
        </button>
      )}

      {open && (
        <div className={cls.dropdown} role="dialog" aria-label="Выбор диапазона дат">
          <FormField label="От" htmlFor="date-from">
            <Input
              id="date-from"
              name="dateFrom"
              type="date"
              value={dateFrom}
              onChange={(from) => onChange({ from, to: dateTo })}
            />
          </FormField>
          <FormField label="До" htmlFor="date-to">
            <Input
              id="date-to"
              name="dateTo"
              type="date"
              value={dateTo}
              onChange={(to) => onChange({ from: dateFrom, to })}
            />
          </FormField>
          <Button variant="primary" fullWidth onClick={() => setOpen(false)}>
            Применить
          </Button>
        </div>
      )}
    </div>
  );
});

DateRangeFilter.displayName = 'DateRangeFilter';
