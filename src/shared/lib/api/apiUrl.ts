/**
 * Динамический API URL — работает и в браузере и в Capacitor/Android.
 *
 * Приоритет:
 *   1. localStorage 'api_server_url' — ручная настройка адреса
 *   2. import.meta.env.DEV         — dev-режим Vite: возвращаем '' (relative URL)
 *                                    Vite proxy форвардит запросы на VITE_API_URL
 *   3. VITE_API_URL из .env        — production-сборка: явно заданный адрес сервера
 *   4. window.location.origin       — продакшн браузер: origin страницы = адрес бэкенда
 *                                    ПРОПУСКАЕТСЯ для Capacitor (origin = http://localhost)
 *   5. __API__ compile-time fallback — вшит при yarn build
 */

const STORAGE_KEY = 'api_server_url';

/**
 * Проверяет, что origin является локальным адресом Capacitor/WebView,
 * а не реальным сервером. Такой origin нельзя использовать как baseUrl API.
 */
function isCapacitorOrigin(origin: string): boolean {
  return (
    origin.startsWith('capacitor://') ||
    origin.startsWith('file://')       ||
    origin === 'null'                  ||
    origin === 'capacitor://localhost' ||
    origin === 'http://localhost'      ||  // Capacitor androidScheme: 'http'
    origin === 'https://localhost'
  );
}

/** Безопасно извлекает origin из строки URL (не бросает исключений). */
function safeOrigin(url: string): string {
  try { return new URL(url).origin; } catch { return url; }
}

export function getApiUrl(): string {
  if (typeof window !== 'undefined') {
    // 1. Сохранённый адрес (Capacitor + браузер).
    // Игнорируем localhost-адреса — пользователь мог сохранить их по ошибке.
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && !isCapacitorOrigin(safeOrigin(saved))) return saved;
  }

  // 2. Dev-режим (Vite dev server) — возвращаем пустой baseUrl.
  // RTK Query делает relative запросы (/inspectionSheets и т.д.),
  // которые Vite proxy перехватывает и форвардит на VITE_API_URL.
  if (import.meta.env.DEV) return '';

  // 3. VITE_API_URL — в production-сборке задаётся явно.
  const fromEnv = import.meta.env?.VITE_API_URL ?? '';
  if (fromEnv) return fromEnv;

  if (typeof window !== 'undefined') {
    // 4. Origin страницы — только когда приложение открыто прямо с сервера
    //    (веб-браузер), а не Capacitor/WebView.
    const origin = window.location.origin;
    if (!isCapacitorOrigin(origin)) return origin;
  }

  // 5. Compile-time fallback (вшит при yarn build через vite.config __API__).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const builtIn = (typeof __API__ !== 'undefined' ? __API__ : '') as string;
  return builtIn || 'http://localhost:8443';
}

export function setApiUrl(url: string): void {
  const clean = url.trim().replace(/\/+$/, '');
  localStorage.setItem(STORAGE_KEY, clean);
}

export function clearApiUrl(): void {
  localStorage.removeItem(STORAGE_KEY);
}
