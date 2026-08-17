import { memo, useState, useCallback, useEffect } from 'react';
import { formatDate } from '@/shared/lib/helpers/formatDate';
import { useParams, useNavigate } from 'react-router-dom';
import { DynamicModuleLoader } from '@/shared/lib/components/DynamicModuleLoader/DynamicModuleLoader';
import type { ReducersList } from '@/shared/lib/components/DynamicModuleLoader/DynamicModuleLoader';
import { useDeleteDefect, getLocationKey } from '@/entities/DefectRecord';
import type { DefectRecordFull } from '@/entities/DefectRecord';
import { fixDefectActions } from '@/features/FixDefect';
import { copyDefectActions } from '@/features/CopyDefect';
import { DefectTable } from '@/widgets/DefectTable';
import { AddDefectBar, addDefectReducer } from '@/features/AddDefect';
import { FixDefectModal, fixDefectReducer } from '@/features/FixDefect';
import { CopyDefectModal, copyDefectReducer } from '@/features/CopyDefect';
import { ExportButton } from '@/features/ExportToExcel';
import { PageLoader } from '@/widgets/PageLoader';
import { ProgressRing, Button, ConfirmModal } from '@/shared/ui';
import { DefectSidebar } from '@/features/DefectSidebar';
import { DefectTimeline } from '@/features/DefectTimeline';
import {
  useGetDefectTypesQuery,
  useGetFilialsQuery,
  useGetLinesQuery,
  useGetPhasesQuery,
  useGetVoltagesQuery,
} from '@/entities/InspectionLine';
import { usePendingSheets, getSyncedServerId, clearSyncedSheet } from '@/shared/lib/offline/pendingSheets';
import { usePendingDefects } from '@/shared/lib/offline/pendingDefects';
import type { PendingDefect } from '@/shared/lib/offline/pendingDefects';
import { useSheetDetail } from '../model/useSheetDetail';
import { useSheetKeyboard } from '../model/useSheetKeyboard';
import { getRouteSheetDetail } from '@/shared/const/router';
import cls from './SheetDetailPage.module.scss';

const reducers: ReducersList = {
  addDefect: addDefectReducer,
  fixDefect: fixDefectReducer,
  copyDefect: copyDefectReducer,
};

const offlineReducers: ReducersList = { addDefect: addDefectReducer };

function getRingColor(pct: number): string {
  if (pct >= 80) return 'var(--color-success)';
  if (pct >= 40) return 'var(--color-warning)';
  return 'var(--color-error)';
}

/** Иконка: WiFi с перечёркиванием — признак офлайн-режима. */
const OfflineIcon = () => (
  <svg
    width="17"
    height="17"
    viewBox="0 0 24 24"
    fill="none"
    stroke="var(--color-warning)"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-label="Офлайн"
    style={{ flexShrink: 0 }}
  >
    <path d="M5 12.55a11 11 0 0 1 14.08 0" opacity="0.5" />
    <path d="M1.42 9a16 16 0 0 1 21.16 0" opacity="0.3" />
    <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
    <circle
      cx="12" cy="20" r="1.5"
      fill="var(--color-warning)"
      stroke="none"
    />
    <line
      x1="2" y1="2" x2="22" y2="22"
      stroke="var(--color-error)"
      strokeWidth="2"
    />
  </svg>
);

/** Строка таблицы офлайн-дефекта. */
const OfflineDefectRow = memo(({
  defect,
  defectTypes,
  phases,
  index,
}: {
  defect: PendingDefect;
  defectTypes: ReturnType<typeof useGetDefectTypesQuery>['data'];
  phases: ReturnType<typeof useGetPhasesQuery>['data'];
  index: number;
}) => {
  const dt    = (defectTypes ?? []).find((d: { id: number }) => d.id === defect.defectId) as { name: string } | undefined;
  const phase = defect.phaseId ? (phases ?? []).find((p: { id: number; name: string }) => p.id === defect.phaseId) : null;
  const loc   = defect.poleNumber > 0
    ? `Оп. ${defect.poleNumber}`
    : `Пр. ${defect.spanRange ?? ''}`;
  return (
    <tr style={{ borderBottom: '1px solid var(--color-border)', fontSize: 'var(--font-size-s)' }}>
      <td style={{ padding: '6px 8px', color: 'var(--color-text-muted)' }}>{index}</td>
      <td style={{ padding: '6px 8px' }}>{loc}</td>
      <td style={{ padding: '6px 8px' }}>{dt?.name ?? '—'}</td>
      <td style={{ padding: '6px 8px', color: 'var(--color-text-secondary)' }}>
        {phase?.name ?? '—'}
      </td>
      <td style={{ padding: '6px 8px', color: 'var(--color-text-secondary)' }}>
        {defect.inspectorFind}
      </td>
    </tr>
  );
});
OfflineDefectRow.displayName = 'OfflineDefectRow';

// ── Внутренняя часть офлайн-листка (внутри DynamicModuleLoader) ───────────────────
const OfflinePendingInner = memo(({ localId }: { localId: number }) => {
  const navigate = useNavigate();
  const pendingSheets = usePendingSheets();
  const pending = pendingSheets.find((s) => s.localId === localId);

  // Когда листок синхронизовался быстрее 50ms, redirect не успел сработать — читаем маппинг
  useEffect(() => {
    if (pending) return;
    const serverId = getSyncedServerId(localId);
    if (serverId !== null) {
      clearSyncedSheet(localId);
      navigate(getRouteSheetDetail(String(serverId)), { replace: true });
    }
  }, [pending, localId, navigate]);

  const pendingDefects          = usePendingDefects(localId);
  const { data: filials  = [] } = useGetFilialsQuery();
  const { data: voltages = [] } = useGetVoltagesQuery();
  const { data: lines    = [] } = useGetLinesQuery();
  const { data: defectTypes }   = useGetDefectTypesQuery();
  const { data: phases }        = useGetPhasesQuery();

  if (!pending) return <div className={cls.notFound}>Листок не найден</div>;

  const filial  = filials.find((f) => f.id === pending.filialId);
  const voltage = voltages.find((v) => v.id === pending.voltageId);
  const line    = lines.find((l) => l.id === pending.lineId);

  return (
    <div className={cls.page}>
      <div className={cls.infoBar}>
        <div className={cls.infoText}>
          <OfflineIcon />
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

      <div className={cls.body} style={{ overflowY: 'auto' }}>
        {pendingDefects.length === 0 ? (
          <p style={{ padding: '1rem', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-s)' }}>
            Дефектов пока нет
          </p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--color-bg-surface-2)', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', textAlign: 'left' }}>
                <th style={{ padding: '6px 8px', width: 32 }}>#</th>
                <th style={{ padding: '6px 8px' }}>Место</th>
                <th style={{ padding: '6px 8px' }}>Дефект</th>
                <th style={{ padding: '6px 8px' }}>Фаза</th>
                <th style={{ padding: '6px 8px' }}>Обнаружил</th>
              </tr>
            </thead>
            <tbody>
              {pendingDefects.map((d, i) => (
                <OfflineDefectRow
                  key={d.localId}
                  defect={d}
                  defectTypes={defectTypes}
                  phases={phases}
                  index={i + 1}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
});
OfflinePendingInner.displayName = 'OfflinePendingInner';

// ── Офлайн-листок ─────────────────────────────────────────────────────────────────
const OfflinePendingDetail = memo(({ localId }: { localId: number }) => (
  <DynamicModuleLoader reducers={offlineReducers}>
    <OfflinePendingInner localId={localId} />
  </DynamicModuleLoader>
));
OfflinePendingDetail.displayName = 'OfflinePendingDetail';

// ── Онлайн-листок ─────────────────────────────────────────────────────────────────
const OnlineSheetDetail = memo(({ sheetId }: { sheetId: number }) => {
  const { sheet, sheetFull, defectsFull, fixedPct, totalCount, isLoading } = useSheetDetail(sheetId);

  const [sidebarDefect, setSidebarDefect] = useState<DefectRecordFull | null>(null);
  const [showTimeline,  setShowTimeline]  = useState(false);

  const { openModal: openFixModal }  = fixDefectActions.useActions();
  const { openModal: openCopyModal } = copyDefectActions.useActions();
  const { handleDelete: deleteDefectById, confirmProps } = useDeleteDefect();

  const handleFocusAdd = useCallback(() => {
    const el = document.getElementById('add-pole') as HTMLInputElement | null;
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el?.focus();
  }, []);

  const handleToggleTimeline = useCallback(() => setShowTimeline((v) => !v), []);

  useSheetKeyboard({ onFocusAdd: handleFocusAdd, onToggleTimeline: handleToggleTimeline });

  const handleSidebarFix = useCallback((_defectId: number) => {
    if (sidebarDefect) openFixModal(getLocationKey(sidebarDefect));
    setSidebarDefect(null);
  }, [openFixModal, sidebarDefect]);

  const handleSidebarDelete = useCallback(async (defectId: number) => {
    const ok = await deleteDefectById(defectId);
    if (ok) setSidebarDefect(null);
  }, [deleteDefectById]);

  const handleSaveInspector = useCallback((id: number, value: string) => {
    setSidebarDefect((prev) => prev && prev.id === id ? { ...prev, inspectorFind: value } : prev);
  }, []);

  const handleCloseSidebar  = useCallback(() => setSidebarDefect(null), []);
  const handleCloseTimeline = useCallback(() => setShowTimeline(false), []);

  if (isLoading) return <PageLoader />;
  if (!sheet || !sheetFull) return (
    <div className={cls.notFound}>Листок осмотра не найден</div>
  );

  return (
    <DynamicModuleLoader reducers={reducers}>
      <div className={cls.page}>

        <div className={cls.infoBar}>
          <div className={cls.infoText}>
            <span className={cls.lineName}>{sheetFull.lineName}</span>
            <span className={cls.metaSep}>|</span>
            <span className={cls.metaItem}>{sheetFull.filialName}</span>
            <span className={cls.metaSep}>|</span>
            <span className={cls.metaItem}>{sheetFull.voltageName}</span>
            <span className={cls.metaSep}>|</span>
            <span className={cls.metaItem}>
              Опоры {sheetFull.poleStart}–{sheetFull.poleEnd} ({sheetFull.poleCount} шт.)
            </span>
            <span className={cls.metaSep}>|</span>
            <span className={cls.metaItem}>
              {formatDate(sheetFull.createdDate)} · {sheetFull.createdBy}
            </span>
          </div>

          {totalCount > 0 && (
            <ProgressRing pct={fixedPct} color={getRingColor(fixedPct)} label="исп." size={52} />
          )}

          <Button
            variant="secondary"
            size="s"
            onClick={handleToggleTimeline}
            title="Лента событий дефектов (Alt+T)"
          >
            Лента
          </Button>

          <div className={cls.spacer} />

          <ExportButton sheet={sheetFull} />
        </div>

        <AddDefectBar
          key={`${sheetId}-${sheetFull.createdDate}-${sheetFull.createdBy}`}
          sheetId={sheetId}
          poleStart={sheetFull.poleStart}
          poleEnd={sheetFull.poleEnd}
          sheetDate={sheetFull.createdDate}
          sheetInspector={sheetFull.createdBy}
        />

        <div className={cls.body}>
          <DefectTable
            sheetId={sheetId}
            onRowClick={setSidebarDefect}
            onFix={openFixModal}
            onCopy={openCopyModal}
          />
        </div>

        {sidebarDefect && (
          <DefectSidebar
            defect={sidebarDefect}
            onClose={handleCloseSidebar}
            onFix={handleSidebarFix}
            onDelete={handleSidebarDelete}
            onSaveInspector={handleSaveInspector}
          />
        )}

        {showTimeline && (
          <DefectTimeline defects={defectsFull} onClose={handleCloseTimeline} />
        )}

        <FixDefectModal sheetId={sheetId} />
        <CopyDefectModal sheetId={sheetId} poleStart={sheetFull.poleStart} poleEnd={sheetFull.poleEnd} />
        <ConfirmModal {...confirmProps} />
      </div>
    </DynamicModuleLoader>
  );
});
OnlineSheetDetail.displayName = 'OnlineSheetDetail';

// ── Роутер страницы ───────────────────────────────────────────────────────────────
const SheetDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const sheetId = Number(id);

  if (sheetId < 0) return <OfflinePendingDetail localId={sheetId} />;
  return <OnlineSheetDetail sheetId={sheetId} />;
};

export default memo(SheetDetailPage);
