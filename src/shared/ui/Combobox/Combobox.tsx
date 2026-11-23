import { memo } from 'react';
import { classNames } from '@/shared/lib/classNames/classNames';
import { Portal } from '../Portal';
import { useCombobox } from './useCombobox';
import cls from './Combobox.module.scss';

export interface ComboboxOption<V extends string | number = string | number> {
  value: V;
  label: string;
}

export interface ComboboxProps<V extends string | number = string | number> {
  options: ReadonlyArray<ComboboxOption<V>>;
  value: V | '';
  onChange: (value: V | '') => void;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  id?: string;
  name?: string;
  className?: string;
  /** Сколько вариантов показывать максимум (для производительности при большом списке). */
  maxItems?: number;
}

/**
 * Combobox = Input + выпадающий список с автодополнением.
 * Пользователь печатает в поле — список фильтруется по вхождению (case-insensitive).
 * Esc / клик вне — закрывает; Enter / клик по опции — выбирает.
 */
function ComboboxInner<V extends string | number = string | number>(
  props: ComboboxProps<V>,
) {
  const {
    options,
    value,
    onChange,
    placeholder = '',
    disabled,
    invalid,
    id,
    name,
    className,
    maxItems = 100,
  } = props;

  const {
    open,
    query,
    highlight,
    setHighlight,
    wrapRef,
    inputRef,
    panelRef,
    selected,
    filtered,
    handleInput,
    handleFocus,
    handlePick,
    handleKey,
  } = useCombobox({ options, value, onChange, disabled, maxItems });

  return (
    <div
      ref={wrapRef}
      className={classNames(cls.wrap, { [cls.invalid]: !!invalid, [cls.disabled]: !!disabled }, [className])}
    >
      <input
        ref={inputRef}
        id={id}
        name={name}
        type="text"
        className={cls.input}
        placeholder={placeholder}
        value={open ? query : (selected?.label ?? '')}
        onChange={handleInput}
        onFocus={handleFocus}
        onKeyDown={handleKey}
        disabled={disabled}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
      />
      <span className={cls.arrow} aria-hidden>▼</span>

      {open && (
        <Portal>
          <div
            ref={panelRef}
            className={cls.panel}
            style={{ visibility: 'hidden' }}
            role="listbox"
          >
            {filtered.length === 0 ? (
              <div className={cls.empty}>Ничего не найдено</div>
            ) : (
              filtered.map((opt, idx) => (
                <button
                  key={String(opt.value)}
                  type="button"
                  role="option"
                  aria-selected={opt.value === value}
                  className={classNames(cls.option, {
                    [cls.optionActive]: opt.value === value,
                    [cls.optionHighlight]: idx === highlight,
                  })}
                  onMouseEnter={() => setHighlight(idx)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handlePick(opt)}
                >
                  {opt.label}
                </button>
              ))
            )}
          </div>
        </Portal>
      )}
    </div>
  );
}

export const Combobox = memo(ComboboxInner) as <
  V extends string | number = string | number,
>(props: ComboboxProps<V>) => JSX.Element;
