import { memo, useMemo } from 'react';
import { Dropdown } from '../Dropdown';
import cls from './SelectMenu.module.scss';

export interface SelectMenuOption {
  value: string;
  label: string;
}

interface SelectMenuProps {
  options:     SelectMenuOption[];
  value:       string;
  onChange:    (v: string) => void;
  placeholder?: string;
  panelWidth?: number | string;
  className?:  string;
}

export const SelectMenu = memo(({
  options, value, onChange, placeholder = '—', panelWidth, className,
}: SelectMenuProps) => {
  const selected = useMemo(
    () => options.find((o) => o.value === value),
    [options, value],
  );

  return (
    <Dropdown
      panelWidth={panelWidth}
      wrapperClassName={className}
      trigger={({ open, toggle }) => (
        <button
          type='button'
          className={`${cls.trigger}${open ? ` ${cls.open}` : ''}`}
          onClick={toggle}
          aria-haspopup='listbox'
          aria-expanded={open}
        >
          <span className={cls.label}>{selected ? selected.label : placeholder}</span>
          <span className={cls.arrow} aria-hidden>▾</span>
        </button>
      )}
    >
      {({ close }) => (
        <ul className={cls.list} role='listbox'>
          {options.map((opt) => (
            <li key={opt.value} role='option' aria-selected={opt.value === value}>
              <button
                type='button'
                className={`${cls.option}${opt.value === value ? ` ${cls.selected}` : ''}`}
                onClick={() => { onChange(opt.value); close(); }}
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Dropdown>
  );
});

SelectMenu.displayName = 'SelectMenu';
