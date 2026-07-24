import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMergeSheetsMutation } from '@/entities/InspectionSheet';
import type { InspectionSheetFull } from '@/entities/InspectionSheet';
import { getRouteSheetDetail } from '@/shared/const/router';
import { useConfirm } from '@/shared/ui';
import { toast } from '@/shared/lib/toast';
import { logger } from '@/shared/lib/logger';

export function useSheetMerge(sheets: InspectionSheetFull[]) {
  const navigate = useNavigate();
  const { confirm, confirmProps: mergeConfirmProps } = useConfirm();

  const [selectedIds, setSelectedIds]   = useState<Set<number>>(new Set());
  const [mergeOpen, setMergeOpen]       = useState(false);
  const [mergeDate, setMergeDate]       = useState('');
  const [mergeBy, setMergeBy]           = useState('');
  const [mergeSheets, { isLoading: merging }] = useMergeSheetsMutation();

  const mergeLineId = useMemo(
    () => sheets.find((s) => selectedIds.has(s.id))?.lineId ?? null,
    [sheets, selectedIds],
  );
  const mergeLineName = useMemo(
    () => sheets.find((s) => selectedIds.has(s.id))?.lineName ?? '',
    [sheets, selectedIds],
  );
  const selectedSheets = useMemo(
    () => sheets.filter((s) => selectedIds.has(s.id)),
    [sheets, selectedIds],
  );

  const handleSelect = useCallback((id: number, checked: boolean) => {
    if (checked && mergeLineId !== null) {
      const sheet = sheets.find((s) => s.id === id);
      if (sheet && sheet.lineId !== mergeLineId) return;
    }
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) { next.add(id); } else { next.delete(id); }
      return next;
    });
  }, [sheets, mergeLineId]);

  const handleOpenMerge = useCallback(() => {
    setMergeDate(new Date().toISOString().slice(0, 10));
    setMergeBy('');
    setMergeOpen(true);
  }, []);

  const handleCloseMerge = useCallback(() => setMergeOpen(false), []);

  const handleMerge = useCallback(async () => {
    if (selectedIds.size < 2 || !mergeDate) return;
    const ok = await confirm({
      title: `\u041e\u0431\u044a\u0435\u0434\u0438\u043d\u0438\u0442\u044c ${selectedIds.size} \u043b\u0438\u0441\u0442\u043a\u0430?`,
      description: '\u0418\u0441\u0445\u043e\u0434\u043d\u044b\u0435 \u043b\u0438\u0441\u0442\u043a\u0438 \u0438 \u0438\u0445 \u0434\u0435\u0444\u0435\u043a\u0442\u044b \u0431\u0443\u0434\u0443\u0442 \u0443\u0434\u0430\u043b\u0435\u043d\u044b. \u041e\u0441\u0442\u0430\u043d\u0435\u0442\u0441\u044f \u043e\u0434\u0438\u043d \u0441\u0432\u043e\u0434\u043d\u044b\u0439 \u043b\u0438\u0441\u0442\u043e\u043a.',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      const result = await mergeSheets({
        ids: Array.from(selectedIds),
        createdDate: mergeDate,
        createdBy: mergeBy,
      }).unwrap();
      setSelectedIds(new Set());
      setMergeOpen(false);
      navigate(getRouteSheetDetail(String(result.id)));
      toast.success('\u0421\u0432\u043e\u0434\u043d\u044b\u0439 \u043b\u0438\u0441\u0442\u043e\u043a \u0441\u043e\u0437\u0434\u0430\u043d');
    } catch (err) {
      logger.error('Merge sheets failed', err);
      toast.error('\u041e\u0448\u0438\u0431\u043a\u0430 \u043e\u0431\u044a\u0435\u0434\u0438\u043d\u0435\u043d\u0438\u044f \u043b\u0438\u0441\u0442\u043a\u043e\u0432');
    }
  }, [selectedIds, mergeDate, mergeBy, mergeSheets, confirm, navigate]);

  const removeFromSelection = useCallback((id: number) => {
    setSelectedIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
  }, []);

  return {
    selectedIds, mergeOpen, mergeDate, mergeBy, merging,
    mergeLineId, mergeLineName, selectedSheets, mergeConfirmProps,
    handleSelect, handleOpenMerge, handleCloseMerge, handleMerge,
    setMergeDate, setMergeBy, removeFromSelection,
    /** confirm используется снаружи (например для удаления листка) */
    confirm,
  };
}
