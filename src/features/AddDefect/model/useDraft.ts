import { useEffect, useCallback } from 'react';
import { addDefectSlice } from './addDefectSlice';

interface UseDraftOptions {
  sheetId:         number;
  selectedDefectId: number | null;
  poleNumber:      string;
  selectedPhaseIds: number[];
}

/**
 * Сохраняет/восстанавливает черновик дефекта в localStorage.
 * Возвращает handleClearDraft — сбрасывает выбор дефекта/фазы/изолятора.
 */
export function useDraft({
  sheetId,
  selectedDefectId,
  poleNumber,
  selectedPhaseIds,
}: UseDraftOptions) {
  const DRAFT_KEY = `draft_defect_${sheetId}`;
  const { selectDefect, clearDefectSelection, setPhaseIds, setPoleNumber, setInsulatorCount } =
    addDefectSlice.useActions();

  // Восстановление черновика при монтировании
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d.defectId)  selectDefect(d.defectId);
      if (d.poleNumber) setPoleNumber(String(d.poleNumber));
      if (d.phaseIds)  setPhaseIds(d.phaseIds);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [DRAFT_KEY]);

  // Сохранение черновика при изменении
  useEffect(() => {
    try {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ defectId: selectedDefectId, poleNumber, phaseIds: selectedPhaseIds }),
      );
    } catch {}
  }, [DRAFT_KEY, selectedDefectId, poleNumber, selectedPhaseIds]);

  const handleClearDraft = useCallback(() => {
    localStorage.removeItem(DRAFT_KEY);
    clearDefectSelection();
    setPhaseIds([]);
    setInsulatorCount('');
    // poleNumber и spanRange намеренно не сбрасываем
  }, [DRAFT_KEY, clearDefectSelection, setPhaseIds, setInsulatorCount]);

  return { handleClearDraft };
}
