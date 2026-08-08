import { useEffect } from 'react';
import { useAppDispatch } from '@/shared/lib/hooks';
import { rtkApi } from '@/shared/api/rtkApi';

// Интервал фонового опроса — перезапрашиваем данные с сервера
const POLL_INTERVAL_MS = 30_000;

export function useSyncService() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const invalidate = () => {
      dispatch(
        rtkApi.util.invalidateTags([
          { type: 'Sheet',       id: 'LIST' },
          { type: 'Defect',      id: 'LIST' },
          { type: 'DefectCount', id: 'LIST' },
        ]),
      );
    };

    // Фоновый опрос
    const interval = setInterval(invalidate, POLL_INTERVAL_MS);

    // Sync при возврате на вкладку
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') invalidate();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Восстановление сети
    window.addEventListener('online', invalidate);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('online', invalidate);
    };
  }, [dispatch]);
}
