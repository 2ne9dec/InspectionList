import { memo, useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useOutsideClick } from '@/shared/lib/hooks/useOutsideClick';
import type { RefObject } from 'react';
import type { SelectOption } from '../Select';
import cls from './MultiSelect.module.scss';

export interface MultiSelectProps<V extends number | string = number> {
  options: ReadonlyArray<SelectOption<V>>;
  values: V[];
  onChange: (values: V[]) => void;
  placeholder?: string;
  id?: string;
}

interface DropdownPos { top: number; left: number; width: number; }

function MultiSelectInner<V extends number | string = number>(props: MultiSelectProps<V>) {
  const { options, values, onChange, placeholder = '—', id } = props;

  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<DropdownPos>({ top: 0, left: 0, width: 0 });
  const triggerRef  = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // useOutsideClick ожидает однородный массив — приводим к HTMLElement
  const outerRefs = useMemo<RefObject<HTMLElement>[]>(
    () => [triggerRef as RefObject<HTMLElement>, dropdownRef as RefObject<HTMLElement>],
    [],
  );
  useOutsideClick(outerRefs, useCallback(() => setOpen(false), []), { enabled: open });

  const calcPos = useCallback(() => {
    if (!triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 4, left: r.left, width: r.width });
  }, []);

  const handleOpen = useCallback(() => {
    calcPos();
    setOpen((v) => !v);
  }, [calcPos]);

  useEffect(() => {
    if (!open) return;
    window.addEventListener('scroll', calcPos, true);
    window.addEventListener('resize', calcPos);
    return () => {
      window.removeEventListener('scroll', calcPos, true);
      window.removeEventListener('resize', calcPos);
    };
  }, [open, calcPos]);

  const toggle = useCallback((v: V) => {
    const next = values.includes(v) ? values.filter((x) => x !== v) : [...values, v];
    onChange(next);
  }, [values, onChange]);

  const label = useMemo(() => {
    if (values.length === 0) return placeholder;
    return options
      .filter((o) => values.includes(o.value))
      .map((o) => o.label)
      .join(', ');
  }, [values, options, placeholder]);

  const dropdown = open ? createPortal(
    <div
      ref={dropdownRef}
      className={cls.dropdown}
      style={{ top: pos.top, left: pos.left, width: pos.width }}
    >
      {options.map((opt) => {
        const checked = values.includes(opt.value);
        return (
          <label key={String(opt.value)} className={cls.option}>
            <input
              type="checkbox"
              className={cls.checkbox}
              checked={checked}
              onChange={() => toggle(opt.value)}
            />
            <span className={cls.optionLabel}>{opt.label}</span>
          </label>
        );
      })}
    </div>,
    document.body,
  ) : null;

  return (
    <div className={cls.wrapper}>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        className={`${cls.trigger} ${open ? cls.triggerOpen : ''}`}
        onClick={handleOpen}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={`${cls.triggerLabel} ${values.length === 0 ? cls.placeholder : ''}`}>
          {label}
        </span>
        <span className={cls.arrow} aria-hidden>▼</span>
      </button>

      {dropdown}
    </div>
  );
}

export const MultiSelect = memo(MultiSelectInner) as typeof MultiSelectInner;
