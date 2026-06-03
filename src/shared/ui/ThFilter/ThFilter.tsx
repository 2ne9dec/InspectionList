import { memo, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useEscape, useFloatingPosition, useOutsideClick } from '@/shared/lib/hooks';
import { classNames } from '@/shared/lib/classNames/classNames';
import { Portal } from '../Portal';
import { IconClose } from '../Icons';
import cls from './ThFilter.module.scss';

export interface FilterOption {
  id: number | string;
  name: string;
}

export interface ThFilterProps {
  label: ReactNode;
  /** id текущей опции в виде строки. Пустая строка — ничего не выбрано. */
  value: string;
  options: ReadonlyArray<FilterOption>;
  onChange: (value: string) => void;
  width?: number | string;
  className?: string;
}

/**
 * Заголовок колонки с поиском и фильтром-выпадашкой.
 * Использует общие popover-хуки (useOutsideClick + useEscape + useFloatingPosition).
 */
export const ThFilter = memo((props: ThFilterProps) => {
  const { label, value, options, onChange, width, className } = props;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const btnRef = useRef<HTMLButtonElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useOutsideClick([wrapRef, panelRef], () => { setOpen(false); setQuery(''); }, { enabled: open });
  useEscape(() => setOpen(false), { enabled: open });

  const pos = useFloatingPosition(btnRef, { isOpen: open });

  const filtered = useMemo(
    () => options.filter((o) => o.name.toLowerCase().includes(query.toLowerCase())),
    [options, query],
  );

  const selected = options.find((o) => String(o.id) === value);
  const isActive = !!value;

  const handleSelect = (id: string) => {
    onChange(id);
    setOpen(false);
    setQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setQuery('');
  };

  return (
    <th
      className={classNames(cls.th, { [cls.thActive]: isActive }, [className])}
      style={{ width }}
    >
      <div ref={wrapRef} className={cls.wrap}>
        <button
          ref={btnRef}
          type="button"
          className={cls.btn}
          onClick={() => setOpen((p) => !p)}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <span className={cls.label}>{selected ? selected.name : label}</span>
          {isActive
            ? <span className={cls.clear} onClick={handleClear} aria-label="Сбросить"><IconClose size={12} /></span>
            : <span className={cls.arrow} aria-hidden>▼</span>}
        </button>
        {open && (
          <Portal>
            <div
              ref={panelRef}
              className={cls.dropdown}
              style={{ top: pos.top, left: pos.left }}
            >
              <input
                autoFocus
                className={cls.search}
                placeholder="Поиск..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <div className={cls.list} role="listbox">
                {filtered.length === 0 ? (
                  <div className={cls.empty}>Ничего не найдено</div>
                ) : (
                  filtered.map((o) => (
                    <button
                      key={o.id}
                      role="option"
                      aria-selected={String(o.id) === value}
                      className={classNames(cls.option, { [cls.optionActive]: String(o.id) === value })}
                      onClick={() => handleSelect(String(o.id))}
                    >
                      {o.name}
                    </button>
                  ))
                )}
              </div>
            </div>
          </Portal>
        )}
      </div>
    </th>
  );
});

ThFilter.displayName = 'ThFilter';
