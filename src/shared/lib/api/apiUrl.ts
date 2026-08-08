/**
 * Динамический API URL — работает и в браузере и в Capacitor/Android.
 *
 * Приоритет:
 *   1. localStorage 'api_server_url' — ручная настройка адреса
 *   2. import.meta.env.DEV         — dev-режим Vite: возвращаем '' (relative URL)
 *                                    Vite proxy форвардит запросы на VITE_API_URL
 *   3. VITE_API_URL из .env     — production-сборка: явно заданный адрес сервера
 *   4. window.location.origin       — продакшн: origin страницы = адрес бэкенда
 *   5. http://localhost:8443         — последний fallback
 */

const STORAGE_KEY = 'api_server_url';

export function getApiUrl(): string {
  if (typeof window !== 'undefined') {
    // 1. Сохранённый адрес (Capacitor + браузер)
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return saved;
  }

  // 2. Dev-режим (Vite dev server) — возвращаем пустой baseUrl.
  // RTK Query делает relative запросы (/inspectionSheets, /sync и т.д.),
  // которые Vite proxy перехватывает и форвардит на VITE_API_URL (vite.config.ts).
  // Это избегает CORS-блокировки при разработке на ноуте.
  if (import.meta.env.DEV) return '';

  // 3. VITE_API_URL — в production-сборке (yarn build) задаётся явно.
  const fromEnv = import.meta.env?.VITE_API_URL ?? '';
  if (fromEnv) return fromEnv;

  if (typeof window !== 'undefined') {
    // 4. Адрес страницы — работает когда приложение открыто прямо с сервера.
    const origin = window.location.origin;
    const isLocal =
      origin.startsWith('capacitor://') ||
      origin.startsWith('file://') ||
      origin === 'null' ||
      origin === 'capacitor://localhost';
    if (!isLocal) return origin;
  }

  // 5. fallback
  return 'http://localhost:8443';
}

export function setApiUrl(url: string): void {
  const clean = url.trim().replace(/\/+$/, '');
  localStorage.setItem(STORAGE_KEY, clean);
}

export function clearApiUrl(): void {
  localStorage.removeItem(STORAGE_KEY);
}
