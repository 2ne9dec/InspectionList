import { useCallback, useEffect, useMemo, useState } from 'react';
import { useEditDefectMutation } from '@/entities/DefectRecord';
import type { DefectRecord, DefectRecordFull } from '@/entities/DefectRecord';
import { useGetDefectTypesQuery, useGetElementsQuery, useGetPhasesQuery } from '@/entities/InspectionLine';
import type { DefectType } from '@/entities/InspectionLine';
import type { SelectOption } from '@/shared/ui';
import { toast } from '@/shared/lib/toast';
import { capitalizeFirst } from '@/shared/lib/helpers';
import { isSpanValid } from '../lib/location';

interface UseEditDefectFormParams {
  defect: DefectRecordFull | null;
  poleStart: number;
  poleEnd: number;
  onClose: () => void;
  onSaved?: (defect: DefectRecord) => void;
}

/** Состояние и сохранение формы «Исправить дефект». */
export function useEditDefectForm({
  defect,
  poleStart,
  poleEnd,
  onClose,
  onSaved,
}: UseEditDefectFormParams) {
  const { data: elements = [] } = useGetElementsQuery();
  const { data: defectTypes = [] } = useGetDefectTypesQuery();
  const { data: phases = [] } = useGetPhasesQuery();
  const [editDefect, { isLoading }] = useEditDefectMutation();

  const [mode, setMode] = useState<'pole' | 'span'>('pole');
  const [pole, setPole] = useState('');
  const [span, setSpan] = useState('');
  const [defectId, setDefectId] = useState<number | null>(null);
  const [phaseId, setPhaseId] = useState<number | ''>('');
  const [insulators, setInsulators] = useState<number | ''>('');
  const [dateFound, setDateFound] = useState('');
  const [inspector, setInspector] = useState('');
  const [customName, setCustomName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!defect) return;
    setError('');
    setMode(defect.spanRange ? 'span' : 'pole');
    setPole(defect.spanRange ? '' : String(defect.poleNumber));
    setSpan(defect.spanRange ?? '');
    setDefectId(defect.defectId);
    setPhaseId(defect.phaseId ?? '');
    setInsulators(defect.insulatorCount ?? '');
    setDateFound(defect.dateFound ?? '');
    setInspector(defect.inspectorFind ?? '');
    setCustomName(defect.customName ?? '');
  }, [defect]);

  const selectedDefect = useMemo(
    () => defectTypes.find((d) => d.id === defectId),
    [defectTypes, defectId],
  );
  const selectedElement = useMemo(
    () => elements.find((e) => selectedDefect && e.id === selectedDefect.elementId),
    [elements, selectedDefect],
  );
  const phaseOptions = useMemo<SelectOption<number>[]>(
    () => phases.map((p) => ({ value: p.id, label: capitalizeFirst(p.name) })),
    [phases],
  );

  const poleNum = Number(pole.trim());
  const poleOk = mode === 'pole' && Number.isInteger(poleNum) && poleNum >= poleStart && poleNum <= poleEnd;
  const spanOk = mode === 'span' && isSpanValid(span, poleStart, poleEnd);
  const locationInvalid = mode === 'pole' ? !!pole.trim() && !poleOk : !!span.trim() && !spanOk;
  const needsCustomName = !!selectedDefect?.custom;
  const isValid = (poleOk || spanOk) && defectId != null && !!dateFound
    && inspector.trim().length > 0 && (!needsCustomName || customName.trim().length > 0);

  const handlePick = useCallback((d: DefectType) => {
    setDefectId(d.id);
    if (!d.custom) setCustomName('');
  }, []);

  const handleSave = useCallback(async () => {
    if (!defect || !isValid || defectId == null) return;
    setError('');
    try {
      const saved = await editDefect({
        id: defect.id,
        poleNumber: mode === 'pole' ? poleNum : 0,
        spanRange: mode === 'span' ? span.trim() : null,
        defectId,
        phaseId: phaseId === '' ? null : phaseId,
        insulatorCount: insulators === '' ? null : insulators,
        dateFound,
        inspectorFind: inspector.trim(),
        customName: needsCustomName ? customName.trim() : null,
      }).unwrap();
      toast.success('Дефект исправлен');
      onSaved?.(saved);
      onClose();
    } catch (e: unknown) {
      const msg = (e as { data?: { error?: string } })?.data?.error;
      setError(msg ?? 'Не удалось сохранить изменения');
    }
  }, [
    customName, dateFound, defect, defectId, editDefect, insulators, inspector,
    isValid, mode, needsCustomName, onClose, onSaved, phaseId, poleNum, span,
  ]);

  return {
    elements,
    defectTypes,
    selectedDefect,
    selectedElement,
    phaseOptions,
    mode,
    setMode,
    pole,
    setPole,
    span,
    setSpan,
    defectId,
    setDefectId,
    phaseId,
    setPhaseId,
    insulators,
    setInsulators,
    dateFound,
    setDateFound,
    inspector,
    setInspector,
    customName,
    setCustomName,
    error,
    locationInvalid,
    needsCustomName,
    isValid,
    handlePick,
    handleSave,
    isLoading,
  };
}
