import { memo, useMemo, useState, useCallback, useEffect } from 'react';
import { formatDate } from '@/shared/lib/helpers/formatDate';
import { useParams } from 'react-router-dom';
import { DynamicModuleLoader } from '@/shared/lib/components/DynamicModuleLoader/DynamicModuleLoader';
import type { ReducersList } from '@/shared/lib/components/DynamicModuleLoader/DynamicModuleLoader';
import { useGetSheetByIdQuery } from '@/entities/InspectionSheet';
import { useGetFilialsQuery, useGetVoltagesQuery, useGetLinesQuery } from '@/entities/InspectionLine';
import { useGetDefectTypesQuery, useGetElementsQuery, useGetPhasesQuery } from '@/entities/InspectionLine';
import type { InspectionSheetFull } from '@/entities/InspectionSheet';
import type { DefectRecordFull } from '@/entities/DefectRecord';
import { useGetDefectsBySheetQuery, useDeleteDefect, getLocationKey } from '@/entities/DefectRecord';
import { fixDefectActions } from '@/features/FixDefect';
import { DefectTable } from '@/widgets/DefectTable';
import { AddDefectBar, addDefectReducer } from '@/features/AddDefect';
import { FixDefectModal, fixDefectReducer } from '@/features/FixDefect';
import { CopyDefectModal, copyDefectReducer } from '@/features/CopyDefect';
import { ExportButton } from '@/features/ExportToExcel';
import { PageLoader } from '@/widgets/PageLoader';
import { ProgressRing, Button, ConfirmModal } from '@/shared/ui';
import { DefectSidebar } from '@/features/DefectSidebar';
import { DefectTimeline } from '@/features/DefectTimeline';
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

  const { data: sheet, isLoading: sheetLoading } = useGetSheetByIdQuery(sheetId);
  const { data: filials  = [] } = useGetFilialsQuery();
  const { data: voltages = [] } = useGetVoltagesQuery();
  const { data: lines    = [] } = useGetLinesQuery();
  const { data: allDefects  = [] } = useGetDefectsBySheetQuery(sheetId);
  const { data: defectTypes = [] } = useGetDefectTypesQuery();
  const { data: elements    = [] } = useGetElementsQuery();
  const { data: phases      = [] } = useGetPhasesQuery();

  const defectsFull = useMemo<DefectRecordFull[]>(
    () => allDefects.map((d) => {
      const dt = defectTypes.find((t) => t.id === d.defectId);
      const el = elements.find((e) => dt && e.id === dt.element_id);
      const ph = phases.find((p) => p.id === d.phaseId);
      return {
        ...d,
        elementName: el?.name ?? '—',
        defectName:  dt?.name ?? '—',
        phaseName:   ph?.name ?? null,
        severity:    (dt?.severity ?? 'low') as DefectRecordFull['severity'],
      };
    }),
    [allDefects, defectTypes, elements, phases],
  );

  const fixedCount = useMemo(() => allDefects.filter((d) => d.isFixed).length, [allDefects]);
  const totalCount = allDefects.length;
  const fixedPct   = totalCount > 0 ? Math.round((fixedCount / totalCount) * 100) : 0;

  const sheetFull = useMemo<InspectionSheetFull | null>(() => {
    if (!sheet) return null;
    const filial  = filials.find((f) => f.id === sheet.filialId);
    const voltage = voltages.find((v) => v.id === sheet.voltageId);
    const line    = lines.find((l) => l.id === sheet.lineId);
    return {
      ...sheet,
      filialName:  filial?.name  ?? '—',
      voltageName: voltage?.name ?? '—',
      lineName:    line?.name    ?? '—',
      poleStart:   line?.pole_start ?? 1,
      poleEnd:     line?.pole_end   ?? 1,
      poleCount:   line?.pole_count ?? 0,
      activeCount: 0,
      fixedCount:  0,
    };
  }, [sheet, filials, voltages, lines]);

  const [sidebarDefect, setSidebarDefect] = useState<DefectRecordFull | null>(null);
  const [showTimeline,  setShowTimeline]  = useState(false);

  const { openModal: openFixModal } = fixDefectActions.useActions();
  const { handleDelete: deleteDefectById, confirmProps } = useDeleteDefect();

  const handleSidebarFix = useCallback((_defectId: number) => {
    if (sidebarDefect) openFixModal(getLocationKey(sidebarDefect));
    setSidebarDefect(null);
  }, [openFixModal, sidebarDefect]);

  const handleSidebarDelete = useCallback(async (defectId: number) => {
    const ok = await deleteDefectById(defectId);
    if (ok) setSidebarDefect(null);
  }, [deleteDefectById]);

  const handleCloseSidebar  = useCallback(() => setSidebarDefect(null), []);
  const handleCloseTimeline = useCallback(() => setShowTimeline(false), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.altKey && e.code === 'KeyN') {
        e.preventDefault();
        const el = document.getElementById('add-pole') as HTMLInputElement | null;
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el?.focus();
      }
      if (e.altKey && e.code === 'KeyT') {
        e.preventDefault();
        setShowTimeline((v) => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  if (sheetLoading) return <PageLoader />;
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
            onClick={() => setShowTimeline(true)}
            title="Лента событий дефектов (Alt+T)"
          >
            Лента
          </Button>

          {/* Толкаем Excel вправо */}
          <div className={cls.spacer} />

          <ExportButton sheet={sheetFull} />
        </div>

        {/* Добавление дефекта */}
        <AddDefectBar sheetId={sheetId} poleStart={sheetFull.poleStart} poleEnd={sheetFull.poleEnd} />

        {/* Таблица дефектов */}
        <div className={cls.body}>
          <DefectTable sheetId={sheetId} onRowClick={setSidebarDefect} />
        </div>

        {sidebarDefect && (
          <DefectSidebar
            defect={sidebarDefect}
            onClose={handleCloseSidebar}
            onFix={handleSidebarFix}
            onDelete={handleSidebarDelete}
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
