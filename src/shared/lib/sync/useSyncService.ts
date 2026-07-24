import { useEffect } from 'react';
import { useAppDispatch } from '@/shared/lib/hooks';
import { rtkApi } from '@/shared/api/rtkApi';
import { syncService } from './syncService';

// Интервал фоновой синхронизации
const SYNC_INTERVAL_MS = 30_000;

export function useSyncService() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const invalidate = () => {
      dispatch(
        rtkApi.util.invalidateTags([
          { type: 'Sheet',       id: 'LIST' },
          { type: 'Defect',      id: 'LIST' },
          { type: 'DefectCount', id: 'LIST' },
          'References',
        ]),
      );
    };

    window.addEventListener('sync:complete', invalidate);

    // Первый запуск
    syncService.sync().catch(console.error);

    // Восстановление сети
    const handleOnline = () => syncService.sync().catch(console.error);
    window.addEventListener('online', handleOnline);

    // Фоновый опрос
    const interval = setInterval(
      () => syncService.sync().catch(console.error),
      SYNC_INTERVAL_MS,
    );

    return () => {
      window.removeEventListener('sync:complete', invalidate);
      window.removeEventListener('online', handleOnline);
      clearInterval(interval);
    };
  }, [dispatch]);
}
