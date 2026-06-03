import { useCallback, useEffect, useRef } from 'react';

/**
 * Дебаунсит вызов колбэка: каждый новый вызов откладывает выполнение на `delay` мс.
 * Гарантирует очистку таймера при размонтировании.
 *
 * @example
 * const debouncedSearch = useDebounce((value: string) => fetch(...), 300);
 */
export function useDebounce<Args extends unknown[]>(
  callback: (...args: Args) => void,
  delay: number,
): (...args: Args) => void {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(callback);

  // Всегда вызываем актуальную версию колбэка, не пересоздавая дебаунс.
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Чистим таймер при unmount.
  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return useCallback(
    (...args: Args) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => callbackRef.current(...args), delay);
    },
    [delay],
  );
}
