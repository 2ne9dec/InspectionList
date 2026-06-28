import { useEffect } from 'react';
import { useAppDispatch } from '@/shared/lib/hooks';
import { rtkApi } from '@/shared/api/rtkApi';
import { pb } from '@/shared/lib/pocketbase/pbClient';
import { syncService } from './syncService';

// Fallback-интервал на случай если SSE недоступен (офлайн / нет сети)
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

    // Первый запуск — push + pull
    syncService.sync().catch(console.error);

    // Real-time: при любом изменении на сервере — планируем полный sync (push+pull).
    // НЕ вызываем pull() напрямую — это создавало гонку: push мог удалять старые записи
    // и одновременно WebSocket запускал pull, который видел частичное состояние сервера
    // и мог стереть локальные дефекты, ещё не отправленные (например, после слияния листков).
    pb.collection('sheets').subscribe('*', () => {
      syncService.scheduleSync(500);
    }).catch(console.error);

    pb.collection('defect_records').subscribe('*', () => {
      syncService.scheduleSync(500);
    }).catch(console.error);

    // Восстановление сети
    const handleOnline = () => syncService.sync().catch(console.error);
    window.addEventListener('online', handleOnline);

    // Fallback-опрос
    const interval = setInterval(() => syncService.sync().catch(console.error), SYNC_INTERVAL_MS);

    return () => {
      window.removeEventListener('sync:complete', invalidate);
      window.removeEventListener('online', handleOnline);
      clearInterval(interval);
      pb.collection('sheets').unsubscribe('*').catch(console.error);
      pb.collection('defect_records').unsubscribe('*').catch(console.error);
    };
  }, [dispatch]);
}
