import PocketBase from 'pocketbase';

const STORAGE_KEY = 'pb_server_url';

/**
 * URL PocketBase определяется по приоритету:
 * 1. localStorage (настройка пользователя — меняется без пересборки)
 * 2. VITE_PB_URL из .env (задан при сборке)
 * 3. Тот же хост что и приложение, порт 8090
 */
function resolvePbUrl(): string {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && saved.trim()) return saved.trim();
  const envUrl = import.meta.env.VITE_PB_URL as string | undefined;
  if (envUrl && envUrl.trim()) return envUrl.trim();
  return `${window.location.protocol}//${window.location.hostname}:8090`;
}

export const pb = new PocketBase(resolvePbUrl());
pb.autoCancellation(false);

/** Сменить URL сервера без пересборки. Требует перезагрузки страницы. */
export function setPbServerUrl(url: string): void {
  localStorage.setItem(STORAGE_KEY, url.trim());
  window.location.reload();
}

export function getPbServerUrl(): string {
  return pb.baseUrl;
}
