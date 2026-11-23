import { memo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DynamicModuleLoader } from '@/app/providers/StoreProvider';
import type { ReducersList } from '@/app/providers/StoreProvider';
import { AddDefectBar, addDefectReducer } from '@/features/AddDefect';
import {
  useGetFilialsQuery,
  useGetLinesQuery,
  useGetVoltagesQuery,
} from '@/entities/InspectionLine';
import { usePendingSheets, getSyncedServerId, clearSyncedSheet } from '@/shared/lib/offline/pendingSheets';
import { usePendingDefects } from '@/shared/lib/offline/pendingDefects';
import { getRouteSheetDetail } from '@/shared/const/router';
import { IconOffline } from '@/shared/ui/Icons';
import { formatDate } from '@/shared/lib/helpers/formatDate';
import { OfflineDefectTable } from './OfflineDefectTable';
import cls from './SheetDetailPage.module.scss';

const offlineReducers: ReducersList = { addDefect: addDefectReducer };

/** Внутренняя часть офлайн-листка (внутри DynamicModuleLoader). */
const OfflinePendingInner = memo(({ localId }: { localId: number }) => {
  const navigate = useNavigate();
  const pendingSheets = usePendingSheets();
  const pending = pendingSheets.find((s) => s.localId === localId);

  // Листок синхронизировался быстрее редиректа — читаем сохранённый маппинг.
  useEffect(() => {
    if (pending) return;
    const serverId = getSyncedServerId(localId);
    if (serverId !== null) {
      clearSyncedSheet(localId);
      navigate(getRouteSheetDetail(String(serverId)), { replace: true });
    }
  }, [pending, localId, navigate]);

  const pendingDefects = usePendingDefects(localId);
  const { data: filials = [] } = useGetFilialsQuery();
  const { data: voltages = [] } = useGetVoltagesQuery();
  const { data: lines = [] } = useGetLinesQuery();

  if (!pending) return <div className={cls.notFound}>Листок не найден</div>;

  const filial = filials.find((f) => f.id === pending.filialId);
  const voltage = voltages.find((v) => v.id === pending.voltageId);
  const line = lines.find((l) => l.id === pending.lineId);

  return (
    <div className={cls.page}>
      <div className={cls.infoBar}>
        <div className={cls.infoText}>
          <span className={cls.offlineIcon} title="Офлайн-листок">
            <IconOffline size={17} />
          </span>
          <span className={cls.lineName}>{line?.name ?? '—'}</span>
          <span className={cls.metaSep}>|</span>
          <span className={cls.metaItem}>{filial?.name ?? '—'}</span>
          <span className={cls.metaSep}>|</span>
          <span className={cls.metaItem}>{voltage?.name ?? '—'}</span>
          <span className={cls.metaSep}>|</span>
          <span className={cls.metaItem}>
            {line ? `Опоры ${line.poleStart}–${line.poleEnd} (${line.poleCount} шт.)` : ''}
          </span>
          <span className={cls.metaSep}>|</span>
          <span className={cls.metaItem}>
            {formatDate(pending.createdDate)} · {pending.createdBy}
          </span>
        </div>
      </div>

      <AddDefectBar
        key={`offline-${localId}`}
        sheetId={localId}
        poleStart={line?.poleStart ?? 1}
        poleEnd={line?.poleEnd ?? 1}
        sheetDate={pending.createdDate}
        sheetInspector={pending.createdBy}
      />

      <div className={`${cls.body} ${cls.offlineBody}`}>
        <OfflineDefectTable defects={pendingDefects} />
      </div>
    </div>
  );
});
OfflinePendingInner.displayName = 'OfflinePendingInner';

/** Офлайн-листок. */
export const OfflinePendingDetail = memo(({ localId }: { localId: number }) => (
  <DynamicModuleLoader reducers={offlineReducers}>
    <OfflinePendingInner localId={localId} />
  </DynamicModuleLoader>
));
OfflinePendingDetail.displayName = 'OfflinePendingDetail';
