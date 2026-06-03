/**
 * Единая точка логирования. В dev — печатает в консоль, в prod —
 * info/debug подавляются, error/warn идут в консоль и (опционально)
 * могут быть переподписаны на внешний сборщик (Sentry / собственный logger).
 *
 * Использование:
 *   import { logger } from '@/shared/lib/logger';
 *   logger.error('CopyDefect failed', err);
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';
type Listener = (level: LogLevel, args: unknown[]) => void;

const listeners: Listener[] = [];

function emit(level: LogLevel, args: unknown[]) {
  for (const l of listeners) {
    try {
      l(level, args);
    } catch {
      /* sink — слушатели не должны ронять приложение */
    }
  }
}

declare const __IS_DEV__: boolean;
const isDev = typeof __IS_DEV__ !== 'undefined' ? __IS_DEV__ : true;

export const logger = {
  debug(...args: unknown[]) {
    if (isDev) console.debug('[debug]', ...args);
    emit('debug', args);
  },
  info(...args: unknown[]) {
    if (isDev) console.info('[info]', ...args);
    emit('info', args);
  },
  warn(...args: unknown[]) {
    console.warn('[warn]', ...args);
    emit('warn', args);
  },
  error(...args: unknown[]) {
    console.error('[error]', ...args);
    emit('error', args);
  },
  /** Подписаться на лог-события (например, чтобы пересылать в Sentry). */
  subscribe(fn: Listener) {
    listeners.push(fn);
    return () => {
      const i = listeners.indexOf(fn);
      if (i >= 0) listeners.splice(i, 1);
    };
  },
};
