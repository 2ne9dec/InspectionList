import { useMemo } from 'react';

/** Возвращает true если ширина viewport < 480px (мобильный телефон).
 *  Значение вычисляется один раз при монтировании — достаточно для
 *  компонентов, которые не меняют layout при ресайзе окна браузера.
 */
export function useIsMobile(): boolean {
  return useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 479px)').matches,
    [],
  );
}
