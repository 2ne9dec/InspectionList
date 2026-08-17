import { useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch } from '@/shared/lib/hooks';
import { rtkApi } from '@/shared/api/rtkApi';
import { useCreateSheetMutation } from '@/entities/InspectionSheet';
import { useCreateDefectMutation } from '@/entities/DefectRecord';
import { getPendingSheets, removePendingSheet, markSyncedSheet } from '@/shared/lib/offline/pendingSheets';
import { getPendingDefects, removePendingDefectsForSheet } from '@/shared/lib/offline/pendingDefects';
import { getRouteSheetDetail } from '@/shared/const/router';

// Интервал фонового опроса
const POLL_INTERVAL_MS = 30_000;

// Событие для ручного запуска синхронизации (кнопка "Обновить")
export const SYNC_EVENT = 'triggerPendingSync';

export function useSyncService() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [createSheet] = useCreateSheetMutation();
  const [createDefect] = useCreateDefectMutation();

  // Синхронизирует офлайн-листки и их дефекты с сервером
  const syncPending = useCallback(async () => {
    const pending = getPendingSheets();
    if (!pending.length) return;
    let synced = false;
    for (const sheet of pending) {
      let serverId: number | null = null;
      try {
        const created = await createSheet({
          filialId:    sheet.filialId,
          voltageId:   sheet.voltageId,
          lineId:      sheet.lineId,
          createdBy:   sheet.createdBy,
          createdDate: sheet.createdDate,
        }).unwrap();
        serverId = created.id;
        markSyncedSheet(sheet.localId, created.id); // сохраняем маппинг до удаления
        removePendingSheet(sheet.localId);
        synced = true;

        // Если пользователь сейчас на странице офлайн-листка — перенаправить к реальному
        if (window.location.pathname === `/sheet/${sheet.localId}`) {
          navigate(getRouteSheetDetail(String(created.id)));
        }
      } catch {
        // Всё ещё нет сети — прекращаем, попробуем позже
        break;
      }
      // Синхронизируем дефекты этого листка
      if (serverId !== null) {
        const defects = getPendingDefects(sheet.localId);
        let allDefectsSynced = true;
        for (const defect of defects) {
          try {
            await createDefect({
              sheetId:        serverId,
              poleNumber:     defect.poleNumber,
              defectId:       defect.defectId,
              phaseId:        defect.phaseId,
              dateFound:      defect.dateFound,
              inspectorFind:  defect.inspectorFind,
              insulatorCount: defect.insulatorCount ?? null,
              spanRange:      defect.spanRange ?? null,
              garlandNumber:  defect.garlandNumber ?? null,
              notes:          defect.notes ?? null,
            }).unwrap();
          } catch {
            allDefectsSynced = false;
            break;
          }
        }
        if (allDefectsSynced) {
          removePendingDefectsForSheet(sheet.localId);
        }
      }
    }
    if (synced) {
      dispatch(rtkApi.util.invalidateTags([
        { type: 'Sheet',       id: 'LIST' },
        { type: 'Defect',      id: 'LIST' },
        { type: 'DefectCount', id: 'LIST' },
      ]));
    }
  }, [createSheet, createDefect, dispatch, navigate]);

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

    // Синхронизация + обновление при появлении сети
    const handleOnline = () => { syncPending(); invalidate(); };

    // Ручной запуск синхронизации (кнопка "Обновить")
    const handleManualSync = () => { syncPending(); };

    // Фоновый опрос
    const interval = setInterval(invalidate, POLL_INTERVAL_MS);

    // Sync при возврате на вкладку
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') invalidate();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Восстановление сети
    window.addEventListener('online', handleOnline);

    // Ручной триггер синхронизации
    window.addEventListener(SYNC_EVENT, handleManualSync);

    // Синхронизация при монтировании (данные из прошлой сессии)
    syncPending();

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener(SYNC_EVENT, handleManualSync);
    };
  }, [dispatch, syncPending]);
}
