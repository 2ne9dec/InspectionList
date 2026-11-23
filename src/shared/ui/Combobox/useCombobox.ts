import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ChangeEvent, KeyboardEvent } from 'react';
import { useEscape, useOutsideClick } from '@/shared/lib/hooks';
import type { ComboboxOption } from './Combobox';

interface UseComboboxParams<V extends string | number> {
  options: ReadonlyArray<ComboboxOption<V>>;
  value: V | '';
  onChange: (value: V | '') => void;
  disabled?: boolean;
  maxItems: number;
}

/** Состояние, фильтрация и клавиатурная навигация Combobox. */
export function useCombobox<V extends string | number>({
  options,
  value,
  onChange,
  disabled,
  maxItems,
}: UseComboboxParams<V>) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(
    () => options.find((o) => o.value === value),
    [options, value],
  );

  // При закрытии синхронизируем query с выбранным значением.
  useEffect(() => {
    if (!open) setQuery(selected?.label ?? '');
  }, [open, selected]);

  const close = useCallback(() => setOpen(false), []);
  useOutsideClick([wrapRef, panelRef], close, { enabled: open });
  useEscape(close, { enabled: open });

  useLayoutEffect(() => {
    if (!open || !panelRef.current || !wrapRef.current) return;
    const panel = panelRef.current;
    const wr = wrapRef.current.getBoundingClientRect();
    panel.style.left = `${wr.left}px`;
    panel.style.width = `${wr.width}px`;
    panel.style.top = `${wr.bottom + 4}px`;
    const pr = panel.getBoundingClientRect();
    if (pr.bottom > window.innerHeight) {
      panel.style.top = `${Math.max(wr.top - pr.height - 4, 4)}px`;
    }
    panel.style.visibility = 'visible';
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    // Если query совпадает с label выбранного — показываем весь список,
    // иначе нельзя открыть выпадашку, не сбросив текст.
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

  return {
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
  };
}
