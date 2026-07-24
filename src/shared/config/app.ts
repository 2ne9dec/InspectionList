/**
 * Глобальная конфигурация приложения — единая точка истины для:
 *   - API endpoints
 *   - feature flags
 *   - environment-зависимых констант
 *
 * Все env-переменные читаются ОДИН раз при загрузке модуля.
 * В коде используйте импорт констант, а не import.meta.env напрямую.
 */

const env = import.meta.env;

// Define-переменные (заданы в vite.config.ts через define).
// Декларации — в src/app/types/global.d.ts.
declare const __IS_DEV__: boolean;
declare const __API__: string;
declare const __PROJECT__: string;

/** Вычисляет базовый URL API:
 *  1. __API__ define (Vite) — если задан
 *  2. VITE_API_URL env — если задан
 *  3. window.location.origin — в production (сервер, с которого загружена страница)
 *  4. http://localhost:8443 — fallback для dev
 */
function resolveApiUrl(): string {
  const fromDefine = typeof __API__ !== 'undefined' ? __API__ : '';
  if (fromDefine) return fromDefine;
  const fromEnv = env?.VITE_API_URL ?? '';
  if (fromEnv) return fromEnv;
  if (typeof window !== 'undefined') return window.location.origin;
  return 'http://localhost:8443';
}

export const appConfig = {
  /** True в development-режиме. */
  isDev: typeof __IS_DEV__ !== 'undefined' ? __IS_DEV__ : env?.DEV ?? false,

  /** True в production. */
  isProd: env?.PROD ?? false,

  /** Тип сборки (для разделения логики client/server/storybook). */
  project: typeof __PROJECT__ !== 'undefined' ? __PROJECT__ : 'frontend',

  /** Базовый URL API. В production автоматически берётся из window.location.origin
   *  — работает с любого IP без пересборки. */
  apiUrl: resolveApiUrl(),

  /** Версия приложения (для логов и Sentry). */
  version: env?.VITE_APP_VERSION ?? '1.0.0',

  /** Длительность анимации модалок (мс) — синхронизирована с CSS. */
  modalAnimationDelay: 300,
} as const;

export type AppConfig = typeof appConfig;
