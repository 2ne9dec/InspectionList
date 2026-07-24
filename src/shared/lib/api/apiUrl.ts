/**
 * Динамический API URL — работает и в браузере и в Capacitor/Android.
 *
 * Приоритет:
 *   1. localStorage 'api_server_url' — если пользователь настроил вручную
 *   2. window.location.origin        — если открыто через браузер с сервера
 *   3. VITE_API_URL из env           — fallback для dev
 *   4. http://localhost:8443         — последний fallback
 */

const STORAGE_KEY = 'api_server_url';

export function getApiUrl(): string {
  if (typeof window !== 'undefined') {
    // 1. Сохранённый адрес (Capacitor + браузер)
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return saved;

    // 2. Адрес страницы (работает когда открыто с сервера через браузер)
    const origin = window.location.origin;
    const isLocal =
      origin.startsWith('capacitor://') ||
      origin.startsWith('file://') ||
      origin === 'null' ||
      origin === 'capacitor://localhost';
    if (!isLocal) return origin;
  }

  // 3. env-переменная
  const fromEnv = import.meta.env?.VITE_API_URL ?? '';
  if (fromEnv) return fromEnv;

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
