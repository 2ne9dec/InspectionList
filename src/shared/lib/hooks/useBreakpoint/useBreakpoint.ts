import { useSyncExternalStore } from 'react';
import { BREAKPOINTS, BREAKPOINT_ORDER, getCurrentBreakpoint } from '@/shared/lib/breakpoints';
import type { BreakpointName } from '@/shared/lib/breakpoints';

// Глобальный стор размера экрана (один на всё приложение)
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

if (typeof window !== 'undefined') {
  window.addEventListener('resize', () => {
    listeners.forEach((l) => l());
  });
}

function getSnapshot(): number {
  return typeof window === 'undefined' ? 1024 : window.innerWidth;
}

function getServerSnapshot(): number {
  return 1024;
}

/**
 * Возвращает информацию о текущем брейкпоинте.
 *
 * - `current` — имя текущего брейкпоинта (`mobile` | `tablet` | `desktop` | `wide`)
 * - `width` — ширина viewport в px
 * - `isMobile / isTablet / isDesktop / isWide` — текущий брейкпоинт ровно равен
 * - `isAtLeast(name)` — текущая ширина >= указанного брейкпоинта (mobile-first)
 * - `isBelow(name)` — текущая ширина < указанного брейкпоинта
 */
export function useBreakpoint() {
  const width = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const current = getCurrentBreakpoint(width);

  const isAtLeast = (name: BreakpointName) => width >= BREAKPOINTS[name];
  const isBelow = (name: BreakpointName) => width < BREAKPOINTS[name];

  return {
    width,
    current,
    isMobile: current === 'mobile',
    isTablet: current === 'tablet',
    isDesktop: current === 'desktop',
    isWide: current === 'wide',
    isAtLeast,
    isBelow,
    breakpoints: BREAKPOINT_ORDER,
  } as const;
}
