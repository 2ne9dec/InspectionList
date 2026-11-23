import { useCallback } from 'react';
import { useCreateDefectMutation } from '@/entities/DefectRecord';
import type { DefectType } from '@/entities/InspectionLine';
import { toast } from '@/shared/lib/toast';
import { logger } from '@/shared/lib/logger';
import { addPendingDefect } from '@/shared/lib/offline/pendingDefects';
import { buildDefectPayloads } from '../lib/buildDefectPayloads';
import type { LocationMode } from './addDefectSlice';
import { scrollToLocation } from '../lib/scrollToLocation';

interface PhaseLike {
  id: number;
  name: string;
}

interface UseAddDefectSubmitParams {
  sheetId: number;
  poleStart: number;
  poleEnd: number;
  selectedDefectId: number | null;
  selectedDefect: DefectType | undefined;
  selectedPhaseIds: number[];
  poleNumber: string;
  spanRange: string;
  mode: LocationMode;
  inspector: string;
  dateFound: string;
  insulatorCount: string;
  garlandNumber: string;
  customNameTrimmed: string;
  phases: ReadonlyArray<PhaseLike>;
  isValid: boolean;
  onSuccess: () => void;
}

export function useAddDefectSubmit(params: UseAddDefectSubmitParams) {
  const {
    sheetId,
    poleStart,
    poleEnd,
    selectedDefectId,
    selectedDefect,
    selectedPhaseIds,
    poleNumber,
    spanRange,
    mode,
    inspector,
    dateFound,
    insulatorCount,
    garlandNumber,
    customNameTrimmed,
    phases,
    isValid,
    onSuccess,
  } = params;

  const [createDefect, { isLoading }] = useCreateDefectMutation();

  const handleSubmit = useCallback(async () => {
    if (!isValid || !selectedDefectId) return;

    const { payloads, poleCount, scrollTarget } = buildDefectPayloads({
      selectedDefectId,
      isCustom: !!selectedDefect?.custom,
      selectedPhaseIds,
      phases,
      poleStart,
      poleEnd,
      poleNumber,
      spanRange,
      mode,
      inspector,
      dateFound,
      insulatorCount,
      garlandNumber,
      customNameTrimmed,
    });

    // Офлайн-режим: sheetId < 0 — листок не синхронизован.
    if (sheetId < 0) {
      for (const payload of payloads) {
        addPendingDefect({ localSheetId: sheetId, ...payload });
      }
      onSuccess();
      toast.success('Дефект сохранён офлайн');
      return;
    }

    try {
      await Promise.all(
        payloads.map((payload) => createDefect({ sheetId, ...payload }).unwrap()),
      );
      scrollToLocation(scrollTarget);

      onSuccess();
      if (poleCount > 1) {
        toast.success(`Дефект добавлен на ${poleCount} опор`);
      } else if (payloads.length > 1) {
        toast.success(`Дефект добавлен для ${payloads.length} фаз`);
      } else {
        toast.success('Дефект добавлен');
      }
    } catch (err) {
      logger.error('AddDefect failed', err);
      const status = (err as { status?: number })?.status;
      if (status === 409) {
        toast.warning('Такой дефект уже добавлен на это место');
      } else {
        toast.error('Ошибка при добавлении дефекта');
      }
    }
  }, [
    createDefect,
    customNameTrimmed,
    dateFound,
    garlandNumber,
    inspector,
    insulatorCount,
    isValid,
    mode,
    onSuccess,
    phases,
    poleEnd,
    poleNumber,
    poleStart,
    selectedDefect?.custom,
    selectedDefectId,
    selectedPhaseIds,
    sheetId,
    spanRange,
  ]);

  return { handleSubmit, isLoading };
}
