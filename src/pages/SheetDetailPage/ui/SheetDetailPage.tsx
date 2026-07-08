import { memo, useState, useCallback, useMemo } from 'react';
import { formatDate } from '@/shared/lib/helpers/formatDate';
import { useParams } from 'react-router-dom';
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
import { useSheetDetail } from '../model/useSheetDetail';
import { useSheetKeyboard } from '../model/useSheetKeyboard';
import cls from './SheetDetailPage.module.scss';

const reducers: ReducersList = {
  addDefect: addDefectReducer,
  fixDefect: fixDefectReducer,
  copyDefect: copyDefectReducer,
};

function getRingColor(pct: number): string {
  if (pct >= 80) return 'var(--color-success)';
  if (pct >= 40) return 'var(--color-warning)';
  return 'var(--color-error)';
}

const SheetDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const sheetId = Number(id);

  const { sheet, sheetFull, defectsFull, fixedPct, totalCount, isLoading } = useSheetDetail(sheetId);

  const [sidebarDefect, setSidebarDefect] = useState<DefectRecordFull | null>(null);
  const [showTimeline,  setShowTimeline]  = useState(false);

  // Порядковый номер дефекта в текущем листке (позиция в списке defectsFull)
  const sidebarDefectNumber = useMemo(() => {
    if (!sidebarDefect) return null;
    const idx = defectsFull.findIndex((d) => d.id === sidebarDefect.id);
    return idx >= 0 ? idx + 1 : null;
  }, [defectsFull, sidebarDefect]);

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
  if (!sheet || !sheetFull) return <div className={cls.notFound}>Листок осмотра не найден</div>;

  return (
    <DynamicModuleLoader reducers={reducers}>
      <div className={cls.page}>

        {/* Информационная шапка */}
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

        {/* Добавление дефекта — key форсирует пересоздание когда данные листка готовы */}
        <AddDefectBar
          key={`${sheetId}-${sheetFull.createdDate}-${sheetFull.createdBy}`}
          sheetId={sheetId}
          poleStart={sheetFull.poleStart}
          poleEnd={sheetFull.poleEnd}
          sheetDate={sheetFull.createdDate}
          sheetInspector={sheetFull.createdBy}
        />

        {/* Таблица дефектов */}
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
            defectNumber={sidebarDefectNumber}
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
};

export default memo(SheetDetailPage);
