import { useEffect, useState, useCallback, useRef } from 'react';

/**
 * Определяет доступность сети и сервера.
 * - browserOnline: navigator.onLine (сеть)
 * - serverOnline:  ping к /dashboardStats каждые 15 сек
 */
export function useOnlineStatus(pingUrl = '/dashboardStats', intervalMs = 15_000) {
  const [browserOnline, setBrowserOnline] = useState(() => navigator.onLine);
  const [serverOnline,  setServerOnline]  = useState<boolean | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Слушаем браузерные события
  useEffect(() => {
    const onOnline  = () => setBrowserOnline(true);
    const onOffline = () => setBrowserOnline(false);
    window.addEventListener('online',  onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online',  onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const ping = useCallback(async () => {
    try {
      const ctrl = new AbortController();
      const id   = setTimeout(() => ctrl.abort(), 4_000);
      const res  = await fetch(pingUrl, { signal: ctrl.signal, method: 'HEAD' });
      clearTimeout(id);
      setServerOnline(res.ok || res.status < 500);
    } catch {
      setServerOnline(false);
    }
  }, [pingUrl]);

  // Пингуем при монтировании и по таймеру
  useEffect(() => {
    ping();
    timerRef.current = setInterval(ping, intervalMs);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [ping, intervalMs]);

  // Пингуем сразу когда браузер сообщает о восстановлении сети
  useEffect(() => {
    if (browserOnline) ping();
  }, [browserOnline, ping]);

  const isOnline = browserOnline && (serverOnline === null || serverOnline);
  return { isOnline, browserOnline, serverOnline };
}
