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

export const appConfig = {
  /** True в development-режиме. */
  isDev: typeof __IS_DEV__ !== 'undefined' ? __IS_DEV__ : env?.DEV ?? false,

  /** True в production. */
  isProd: env?.PROD ?? false,

  /** Тип сборки (для разделения логики client/server/storybook). */
  project: typeof __PROJECT__ !== 'undefined' ? __PROJECT__ : 'frontend',

  /** Базовый URL API. Берётся из VITE_API_URL или __API__ define. */
  apiUrl: typeof __API__ !== 'undefined' ? __API__ : (env?.VITE_API_URL ?? 'http://localhost:8443'),

  /** Версия приложения (для логов и Sentry). */
  version: env?.VITE_APP_VERSION ?? '1.0.0',

  /** Длительность анимации модалок (мс) — синхронизирована с CSS. */
  modalAnimationDelay: 300,
} as const;

export type AppConfig = typeof appConfig;
