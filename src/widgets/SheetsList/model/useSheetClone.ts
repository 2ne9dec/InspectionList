import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCloneSheetMutation } from '@/entities/InspectionSheet';
import type { InspectionSheetFull } from '@/entities/InspectionSheet';
import { getRouteSheetDetail } from '@/shared/const/router';
import { toast } from '@/shared/lib/toast';
import { logger } from '@/shared/lib/logger';

export function useSheetClone(sheets: InspectionSheetFull[]) {
  const navigate = useNavigate();

  const [cloneTargetId, setCloneTargetId] = useState<number | null>(null);
  const [cloneDate,     setCloneDate]     = useState('');
  const [cloneBy,       setCloneBy]       = useState('');
  const [cloneSheet, { isLoading: cloning }] = useCloneSheetMutation();

  const cloneTarget = sheets.find((s) => s.id === cloneTargetId);

  const handleOpenClone = useCallback((id: number) => {
    const src = sheets.find((s) => s.id === id);
    setCloneTargetId(id);
    // По умолчанию — следующий день после оригинала (чтобы избежать конфликта дат)
    const baseDate = src?.createdDate ? new Date(src.createdDate) : new Date();
    baseDate.setDate(baseDate.getDate() + 1);
    setCloneDate(baseDate.toISOString().slice(0, 10));
    setCloneBy(src?.createdBy ?? '');
  }, [sheets]);

  const handleCloseClone = useCallback(() => {
    setCloneTargetId(null);
    setCloneDate('');
    setCloneBy('');
  }, []);

  const handleClone = useCallback(async () => {
    if (!cloneTargetId || !cloneDate) return;
    try {
      const result = await cloneSheet({
        id: cloneTargetId,
        newDate: cloneDate,
        createdBy: cloneBy,
      }).unwrap();
      handleCloseClone();
      navigate(getRouteSheetDetail(String(result.id)));
    } catch (err: unknown) {
      logger.error('Clone sheet failed', err);
      const msg = (err as { data?: { error?: string } })?.data?.error;
      toast.error(msg ?? 'Ошибка клонирования');
    }
  }, [cloneTargetId, cloneDate, cloneBy, cloneSheet, handleCloseClone, navigate]);

  return {
    cloneTargetId, cloneDate, cloneBy, cloning, cloneTarget,
    handleOpenClone, handleCloseClone, handleClone,
    setCloneDate, setCloneBy,
  };
}
