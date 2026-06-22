import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState, useMemo } from 'react';
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

function MultiSelectInner<V extends number | string = number>(props: MultiSelectProps<V>) {
  const { options, values, onChange, placeholder = '—', id } = props;

  const [open, setOpen] = useState(false);
  const triggerRef  = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const outerRefs = useMemo<RefObject<HTMLElement>[]>(
    () => [triggerRef as RefObject<HTMLElement>, dropdownRef as RefObject<HTMLElement>],
    [],
  );
  useOutsideClick(outerRefs, useCallback(() => setOpen(false), []), { enabled: open });

  const applyPosition = useCallback(() => {
    if (!dropdownRef.current || !triggerRef.current) return;
    const panel = dropdownRef.current;
    const tr = triggerRef.current.getBoundingClientRect();
    panel.style.left  = `${tr.left}px`;
    panel.style.width = `${tr.width}px`;
    panel.style.top   = `${tr.bottom + 4}px`;
    const pr = panel.getBoundingClientRect();
    if (pr.bottom > window.innerHeight) {
      panel.style.top = `${Math.max(tr.top - pr.height - 4, 4)}px`;
    }
    panel.style.visibility = 'visible';
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    applyPosition();
  }, [open, applyPosition]);

  useEffect(() => {
    if (!open) return;
    window.addEventListener('scroll', applyPosition, true);
    window.addEventListener('resize', applyPosition);
    return () => {
      window.removeEventListener('scroll', applyPosition, true);
      window.removeEventListener('resize', applyPosition);
    };
  }, [open, applyPosition]);

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
      style={{ visibility: 'hidden' }}
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
        onClick={() => setOpen((v) => !v)}
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
