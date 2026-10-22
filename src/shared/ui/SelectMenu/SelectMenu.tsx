import { memo, useMemo } from 'react';
import { Dropdown } from '../Dropdown';
import cls from './SelectMenu.module.scss';

export interface SelectMenuOption {
  value: string;
  label: string;
  /** Полное имя для отображения в кнопке-триггере (если отличается от label в списке) */
  triggerLabel?: string;
  /** Визуальный отступ — для отпаек под основной линией */
  indent?: boolean;
}

interface SelectMenuProps {
  options:     SelectMenuOption[];
  value:       string;
  onChange:    (v: string) => void;
  placeholder?: string;
  panelWidth?: number | string;
  className?:  string;
  disabled?:   boolean;
  /** id для кнопки-триггера — нужен для связки с <label htmlFor>. */
  id?: string;
}

export const SelectMenu = memo(({
  options, value, onChange, placeholder = '—', panelWidth, className, disabled, id,
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
          id={id}
          type='button'
          className={`${cls.trigger}${open ? ` ${cls.open}` : ''}${disabled ? ` ${cls.disabled}` : ''}`}
          onClick={disabled ? undefined : toggle}
          disabled={disabled}
          aria-haspopup='listbox'
          aria-expanded={open}
        >
          <span className={cls.label}>{selected ? (selected.triggerLabel ?? selected.label) : placeholder}</span>
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
                className={`${cls.option}${opt.value === value ? ` ${cls.selected}` : ''}${opt.indent ? ` ${cls.optionIndent}` : ''}`}
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
