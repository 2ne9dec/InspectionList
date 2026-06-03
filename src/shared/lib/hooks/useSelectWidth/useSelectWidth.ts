import { useLayoutEffect, useRef } from 'react';

/**
 * Вычисляет ширину по самому длинному значению из массива options
 * и записывает результат в CSS-переменную cssVar на элементе target.
 *
 * @example
 * const toolbarRef = useRef<HTMLDivElement>(null);
 * useSelectWidth(lines.map(l => l.name), '--line-select-w', toolbarRef);
 * // В SCSS: .selectLine { width: var(--line-select-w, 240px); }
 */
export function useSelectWidth(
  options: string[],
  cssVar: string,
  target: React.RefObject<HTMLElement | null>,
  padding = 40,  // arrow + padding
) {
  const spanRef = useRef<HTMLSpanElement | null>(null);

  useLayoutEffect(() => {
    if (!target.current) return;

    let span = spanRef.current;
    if (!span) {
      span = document.createElement('span');
      span.style.cssText = [
        'position:absolute', 'visibility:hidden', 'white-space:nowrap', 'pointer-events:none',
        'font-size:var(--font-size-m,14px)', 'font-family:var(--font-family-main,inherit)',
        'padding:0',
      ].join(';');
      document.body.appendChild(span);
      spanRef.current = span;
    }

    const longest = options.reduce((a, b) => (a.length >= b.length ? a : b), '— выберите —');
    span.textContent = longest;
    const w = Math.ceil(span.getBoundingClientRect().width) + padding;
    target.current.style.setProperty(cssVar, `${Math.max(w, 100)}px`);
  }, [options, cssVar, padding, target]);

  useLayoutEffect(() => () => { spanRef.current?.remove(); spanRef.current = null; }, []);
}
