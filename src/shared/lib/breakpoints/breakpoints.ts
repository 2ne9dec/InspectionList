/**
 * JS-зеркало SCSS-токенов из shared/styles/tokens/_breakpoints.scss.
 * При изменении одного из значений — синхронизируйте оба файла.
 *
 * Используется через useBreakpoint() — единственный источник информации
 * о текущем размере экрана в JS-коде.
 */

export const BREAKPOINTS = {
  mobile: 0,
  tablet: 768,
  desktop: 1024,
  wide: 1920,
} as const;

export type BreakpointName = keyof typeof BREAKPOINTS;

export const BREAKPOINT_ORDER: BreakpointName[] = ['mobile', 'tablet', 'desktop', 'wide'];

/**
 * Возвращает имя текущего брейкпоинта по ширине viewport.
 */
export function getCurrentBreakpoint(width: number): BreakpointName {
  let current: BreakpointName = 'mobile';
  for (const name of BREAKPOINT_ORDER) {
    if (width >= BREAKPOINTS[name]) current = name;
  }
  return current;
}
