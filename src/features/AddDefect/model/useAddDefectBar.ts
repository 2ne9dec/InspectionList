import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  useGetDefectTypesQuery,
  useGetElementsQuery,
  useGetPhasesQuery,
} from '@/entities/InspectionLine';
import type { DefectType } from '@/entities/InspectionLine';
import { addDefectSlice } from './addDefectSlice';
import {
  selectAddDefectDate,
  selectAddDefectInspector,
  selectAddDefectPhaseIds,
  selectAddDefectPole,
  selectAddDefectSelectedId,
  selectAddDefectInsulatorCount,
  selectAddDefectSpanRange,
  selectAddDefectGarlandNumber,
  selectAddDefectMode,
} from './selectors';
import { useDraft } from './useDraft';
import { useTopDefects } from './useTopDefects';
import { useAddDefectSubmit } from './useAddDefectSubmit';
import { parsePoleList, isSpanValid } from '../lib/location';

interface UseAddDefectBarParams {
  sheetId: number;
  poleStart: number;
  poleEnd: number;
  sheetDate?: string;
  sheetInspector?: string;
}

/** Состояние, валидация и отправка формы добавления дефекта. */
export function useAddDefectBar({
  sheetId,
  poleStart,
  poleEnd,
  sheetDate,
  sheetInspector,
}: UseAddDefectBarParams) {
  const selectedDefectId = useSelector(selectAddDefectSelectedId);
  const selectedPhaseIds = useSelector(selectAddDefectPhaseIds);
  const garlandNumber    = useSelector(selectAddDefectGarlandNumber);
  const poleNumber       = useSelector(selectAddDefectPole);
  const inspectorRaw     = useSelector(selectAddDefectInspector);
  const dateFoundRaw     = useSelector(selectAddDefectDate);
  const inspector = inspectorRaw || sheetInspector || '';
  const dateFound = dateFoundRaw || sheetDate || '';
  const insulatorCount   = useSelector(selectAddDefectInsulatorCount);
  const spanRange        = useSelector(selectAddDefectSpanRange);
  const mode             = useSelector(selectAddDefectMode);

  const {
    selectDefect,
    clearDefectSelection,
    setPhaseIds,
    setGarlandNumber,
    setPoleNumber,
    setInspector,
    setDateFound,
    setInsulatorCount,
    setSpanRange,
    setMode,
    resetDate,
  } = addDefectSlice.useActions();

  useEffect(() => {
    if (sheetDate) setDateFound(sheetDate); else resetDate();
    if (sheetInspector) setInspector(sheetInspector);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const { handleClearDraft } = useDraft({ sheetId, selectedDefectId, poleNumber, selectedPhaseIds });

  // Свободное описание дефекта — для вида «Линейная арматура» (DefectType.custom)
  const [customName, setCustomName] = useState('');
  const customNameTrimmed = customName.trim();

  const handleClearAll = useCallback(() => {
    setCustomName('');
    handleClearDraft();
  }, [handleClearDraft]);

  const { data: elements    = [] } = useGetElementsQuery();
  const { data: defectTypes = [] } = useGetDefectTypesQuery();
  const { data: phases      = [] } = useGetPhasesQuery();

  const topDefects = useTopDefects(sheetId, defectTypes);

  const selectedDefect = useMemo(
    () => defectTypes.find((d) => d.id === selectedDefectId),
    [defectTypes, selectedDefectId],
  );
  const selectedElement = useMemo(
    () => elements.find((e) => selectedDefect && e.id === selectedDefect.elementId),
    [elements, selectedDefect],
  );

  // Валидация
  const maxSpan = poleEnd; // пролёт между верхней опорой и предыдущей
  const isPoleValid = mode === 'pole' && poleNumber.trim().length > 0
    && parsePoleList(poleNumber, poleStart, poleEnd).length > 0;
  const isSpanOk = mode === 'span' && isSpanValid(spanRange, poleStart, maxSpan);
  const hasLocation = isPoleValid || isSpanOk;
  const needsCustomName = !!selectedDefect?.custom;
  const isCustomNameValid = !needsCustomName || customNameTrimmed.length > 0;
  const isValid = !!selectedDefectId && hasLocation && inspector.trim().length > 0
    && !!dateFound && isCustomNameValid;

  // Подсветка ошибок
  const poleInvalid = mode === 'pole' && !!poleNumber.trim() && !isPoleValid;
  const spanInvalid = mode === 'span' && !!spanRange.trim() && !isSpanOk;

  const handlePickDefect = useCallback(
    (defect: DefectType) => {
      setCustomName('');
      selectDefect({ defectId: defect.id, elementId: defect.elementId });
    },
    [selectDefect],
  );

  const { handleSubmit, isLoading } = useAddDefectSubmit({
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
    onSuccess: handleClearAll,
  });

  return {
    elements,
    defectTypes,
    phases,
    selectedDefectId,
    selectedDefect,
    selectedElement,
    selectedPhaseIds,
    garlandNumber,
    poleNumber,
    spanRange,
    mode,
    inspector,
    dateFound,
    insulatorCount,
    customName,
    setCustomName,
    topDefects,
    maxSpan,
    isValid,
    needsCustomName,
    poleInvalid,
    spanInvalid,
    handlePickDefect,
    handleSubmit,
    isLoading,
    clearDefectSelection,
    setPhaseIds,
    setGarlandNumber,
    setPoleNumber,
    setInspector,
    setDateFound,
    setInsulatorCount,
    setSpanRange,
    setMode,
  };
}
