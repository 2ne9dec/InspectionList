import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ChangeEvent, KeyboardEvent } from 'react';
import { classNames } from '@/shared/lib/classNames/classNames';
import {
  useEscape,
  useFloatingPosition,
  useOutsideClick,
} from '@/shared/lib/hooks';
import { Portal } from '../Portal';
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

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // При закрытии — синхронизируем query с выбранным значением.
  const selected = useMemo(
    () => options.find((o) => o.value === value),
    [options, value],
  );

  useEffect(() => {
    if (!open) setQuery(selected?.label ?? '');
  }, [open, selected]);

  const close = useCallback(() => setOpen(false), []);
  useOutsideClick([wrapRef, panelRef], close, { enabled: open });
  useEscape(close, { enabled: open });

  const pos = useFloatingPosition(wrapRef, { isOpen: open });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    // Если query совпадает с label выбранного — показываем весь список,
    // иначе пользователь не сможет «открыть» выпадашку, не сбросив текст.
    if (!q || (selected && q === selected.label.toLowerCase())) {
      return options.slice(0, maxItems);
    }
    return options.filter((o) => o.label.toLowerCase().includes(q)).slice(0, maxItems);
  }, [options, query, selected, maxItems]);

  useEffect(() => {
    setHighlight(0);
  }, [filtered.length]);

  const handleInput = (e: ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    if (!open) setOpen(true);
    // Если пользователь стёр текст — сбрасываем выбор.
    if (e.target.value === '' && value !== '') onChange('');
  };

  const handleFocus = () => {
    if (!disabled) setOpen(true);
  };

  const handlePick = (opt: ComboboxOption<V>) => {
    onChange(opt.value);
    setQuery(opt.label);
    setOpen(false);
    inputRef.current?.blur();
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!open) setOpen(true);
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      if (open && filtered[highlight]) {
        e.preventDefault();
        handlePick(filtered[highlight]);
      }
    } else if (e.key === 'Tab') {
      setOpen(false);
    }
  };

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
            style={{ top: pos.top, left: pos.left, width: wrapRef.current?.offsetWidth }}
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
