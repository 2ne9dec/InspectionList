const SCROLL_DELAY_MS = 500;

/** Прокручивает таблицу дефектов к добавленной опоре/пролёту. */
export function scrollToLocation(locationKey: string): void {
  setTimeout(() => {
    const wrap = document.querySelector('[data-defect-table-wrap]') as HTMLElement | null;
    const target = wrap?.querySelector(`[data-pole-key="${locationKey}"]`) as HTMLElement | null;
    if (wrap && target) {
      wrap.scrollTo({ top: target.offsetTop - wrap.offsetTop - 8, behavior: 'smooth' });
    } else if (wrap) {
      wrap.scrollTo({ top: 9_999_999, behavior: 'smooth' });
    }
  }, SCROLL_DELAY_MS);
}
