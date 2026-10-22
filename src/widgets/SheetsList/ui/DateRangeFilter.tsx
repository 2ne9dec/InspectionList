import { memo, useRef, useState } from 'react';
import { Button, FormField, Input } from '@/shared/ui';
import { useEscape, useOutsideClick } from '@/shared/lib/hooks';
import { formatDate } from '@/shared/lib/helpers';
import cls from './DateRangeFilter.module.scss';

export interface DateRangeFilterProps {
  dateFrom: string;
  dateTo: string;
  onChange: (range: { from: string; to: string }) => void;
}

// Хелперы для пресетов
function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Первый день месяца с offset (0 = текущий, -1 = прошлый) */
function firstOfMonth(offset = 0): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  return toDateStr(d);
}

/** Последний день месяца с offset */
function lastOfMonth(offset = 0): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset + 1);
  d.setDate(0);
  return toDateStr(d);
}

// Быстрые пресеты выбора периода
const PRESETS: Array<{ label: string; from: () => string; to: () => string }> = [
  { label: 'Этот месяц',    from: () => firstOfMonth(0),   to: () => '' },
  { label: 'Прошлый месяц', from: () => firstOfMonth(-1),  to: () => lastOfMonth(-1) },
  { label: '3 месяца',      from: () => firstOfMonth(-2),  to: () => '' },
  { label: '6 месяцев',     from: () => firstOfMonth(-5),  to: () => '' },
  { label: 'Год',           from: () => firstOfMonth(-11), to: () => '' },
  { label: 'Все',           from: () => '',                to: () => '' },
];

/** Название кнопки фильтра: пресет, произвольный диапазон или «Все периоды» */
function getButtonLabel(dateFrom: string, dateTo: string): string {
  if (!dateFrom && !dateTo) return 'Все периоды';
  for (const p of PRESETS) {
    if (p.label === 'Все') continue;
    if (p.from() === dateFrom && p.to() === dateTo) return p.label;
  }
  return `${formatDate(dateFrom, '') || '...'} — ${formatDate(dateTo, '') || '...'}`;
}

/**
 * Кнопка-фильтр диапазона дат с быстрыми пресетами и ручным вводом.
 * Кнопка × встроена внутрь основной кнопки — клик по ней сбрасывает
 * фильтр без открытия дропдауна.
 */
export const DateRangeFilter = memo(({ dateFrom, dateTo, onChange }: DateRangeFilterProps) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useOutsideClick(ref, () => setOpen(false), { enabled: open });
  useEscape(() => setOpen(false), { enabled: open, blurOnClose: true });

  const hasFilter = !!(dateFrom || dateTo);
  const label = getButtonLabel(dateFrom, dateTo);

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
        {hasFilter && (
          <span
            className={cls.clearInner}
            role="button"
            tabIndex={-1}
            aria-label="Показать все периоды"
            onClick={(e) => { e.stopPropagation(); onChange({ from: '', to: '' }); }}
          >
            ×
          </span>
        )}
      </button>

      {open && (
        <div className={cls.dropdown} role="dialog" aria-label="Выбор периода">
          {/* Быстрые пресеты */}
          <div className={cls.presets}>
            {PRESETS.map((p) => {
              const pFrom    = p.from();
              const pTo      = p.to();
              const isActive = pFrom === dateFrom && pTo === dateTo;
              return (
                <button
                  key={p.label}
                  type="button"
                  className={`${cls.preset} ${isActive ? cls.presetActive : ''}`}
                  onClick={() => { onChange({ from: pFrom, to: pTo }); setOpen(false); }}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          <div className={cls.divider} />

          {/* Ручной ввод дат */}
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
