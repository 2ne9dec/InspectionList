import { memo, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { DynamicModuleLoader } from '@/app/providers/StoreProvider';
import type { ReducersList } from '@/app/providers/StoreProvider';
import { useDeleteDefect, getLocationKey } from '@/entities/DefectRecord';
import type { DefectRecordFull } from '@/entities/DefectRecord';
import { fixDefectActions } from '@/features/FixDefect';
import { copyDefectActions } from '@/features/CopyDefect';
import { DefectTable } from '@/widgets/DefectTable';
import { AddDefectBar, EditDefectModal, addDefectReducer } from '@/features/AddDefect';
import { FixDefectModal, fixDefectReducer } from '@/features/FixDefect';
import { CopyDefectModal, copyDefectReducer } from '@/features/CopyDefect';
import { PageLoader } from '@/widgets/PageLoader';
import { ConfirmModal } from '@/shared/ui';
import { DefectSidebar } from '@/features/DefectSidebar';
import { DefectTimeline } from '@/features/DefectTimeline';
import { useSheetDetail } from '../model/useSheetDetail';
import { useSheetKeyboard } from '../model/useSheetKeyboard';
import { usePermissions } from '@/entities/User';
import { OfflinePendingDetail } from './OfflineSheetDetail';
import { SheetInfoBar } from './SheetInfoBar';
import cls from './SheetDetailPage.module.scss';

const reducers: ReducersList = {
  addDefect: addDefectReducer,
  fixDefect: fixDefectReducer,
  copyDefect: copyDefectReducer,
};

// ── Онлайн-листок ─────────────────────────────────────────────────────────────────
const OnlineSheetDetail = memo(({ sheetId }: { sheetId: number }) => {
  const { sheet, sheetFull, defectsFull, fixedPct, totalCount, isLoading } = useSheetDetail(sheetId);
  const { can } = usePermissions();

  const [sidebarDefect, setSidebarDefect] = useState<DefectRecordFull | null>(null);
  const [editingDefect, setEditingDefect] = useState<DefectRecordFull | null>(null);
  const handleEditDefect = useCallback((d: DefectRecordFull) => {
    setSidebarDefect(null);
    setEditingDefect(d);
  }, []);
  const handleCloseEdit = useCallback(() => setEditingDefect(null), []);
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

        <SheetInfoBar
          sheet={sheetFull}
          fixedPct={fixedPct}
          totalCount={totalCount}
          canExport={can('export.excel')}
          onToggleTimeline={handleToggleTimeline}
        />

        {can('defects.create') && (
          <AddDefectBar
            key={`${sheetId}-${sheetFull.createdDate}-${sheetFull.createdBy}`}
            sheetId={sheetId}
            poleStart={sheetFull.poleStart}
            poleEnd={sheetFull.poleEnd}
            sheetDate={sheetFull.createdDate}
            sheetInspector={sheetFull.createdBy}
          />
        )}

        <div className={cls.body}>
          <DefectTable
            sheetId={sheetId}
            onRowClick={setSidebarDefect}
            onFix={openFixModal}
            onCopy={openCopyModal}
            onEdit={handleEditDefect}
            canFix={can('defects.fix')}
            canCopy={can('defects.create')}
            canDelete={can('defects.delete')}
            canEdit={can('defects.edit')}
          />
        </div>

        {sidebarDefect && (
          <DefectSidebar
            defect={sidebarDefect}
            onClose={handleCloseSidebar}
            onFix={handleSidebarFix}
            onDelete={handleSidebarDelete}
            onEdit={handleEditDefect}
            onSaveInspector={handleSaveInspector}
            canEdit={can('defects.edit')}
            canFix={can('defects.fix')}
            canDelete={can('defects.delete')}
          />
        )}

        {showTimeline && (
          <DefectTimeline defects={defectsFull} onClose={handleCloseTimeline} />
        )}

        <FixDefectModal sheetId={sheetId} />
        <EditDefectModal
          defect={editingDefect}
          poleStart={sheetFull.poleStart}
          poleEnd={sheetFull.poleEnd}
          onClose={handleCloseEdit}
        />
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
