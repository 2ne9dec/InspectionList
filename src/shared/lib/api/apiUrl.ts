/**
 * Динамический API URL — работает и в браузере и в Capacitor/Android.
 *
 * Приоритет:
 *   1. localStorage 'api_server_url' — ручная настройка адреса
 *   2. VITE_API_URL из .env         — dev-сервер (yarn start из c:\webProjects\2026\InspectionList)
 *   3. window.location.origin        — продакшн с сервера (c:\InspectionList)
 *   4. http://localhost:8443         — последний fallback
 */

const STORAGE_KEY = 'api_server_url';

export function getApiUrl(): string {
  if (typeof window !== 'undefined') {
    // 1. Сохранённый адрес (Capacitor + браузер)
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return saved;
  }

  // 2. VITE_API_URL — явно заданный адрес (нужен для dev: yarn start из каталога разработки).
  // В продакшне сборке (yarn build) VITE_API_URL не передаётся, поэтому продакшн берёт origin.
  const fromEnv = import.meta.env?.VITE_API_URL ?? '';
  if (fromEnv) return fromEnv;

  if (typeof window !== 'undefined') {
    // 3. Адрес страницы — работает когда приложение открыто прямо с сервера (c:\InspectionList).
    // В этом случае origin = 'http://192.168.100.12:8443' — точный адрес бэкенда.
    const origin = window.location.origin;
    const isLocal =
      origin.startsWith('capacitor://') ||
      origin.startsWith('file://') ||
      origin === 'null' ||
      origin === 'capacitor://localhost';
    if (!isLocal) return origin;
  }

  // 4. fallback
  return 'http://localhost:8443';
}

export function setApiUrl(url: string): void {
  const clean = url.trim().replace(/\/+$/, '');
  localStorage.setItem(STORAGE_KEY, clean);
}

export function clearApiUrl(): void {
  localStorage.removeItem(STORAGE_KEY);
}
