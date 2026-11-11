import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useEditDefectMutation } from '@/entities/DefectRecord';
import type { DefectRecord, DefectRecordFull } from '@/entities/DefectRecord';
import { useGetDefectTypesQuery, useGetElementsQuery, useGetPhasesQuery } from '@/entities/InspectionLine';
import type { DefectType } from '@/entities/InspectionLine';
import { Button, FormField, Input, Modal, Select } from '@/shared/ui';
import type { SelectOption } from '@/shared/ui';
import { toast } from '@/shared/lib/toast';
import { capitalizeFirst } from '@/shared/lib/helpers';
import { isSpanValid } from '../lib/location';
import { DefectPicker } from './DefectPicker';
import cls from './EditDefectModal.module.scss';

const INSULATOR_OPTIONS: SelectOption<number>[] =
  Array.from({ length: 24 }, (_, i) => ({ value: i + 1, label: String(i + 1) }));

interface EditDefectModalProps {
  /** Исправляемый дефект; null — окно закрыто. */
  defect: DefectRecordFull | null;
  poleStart: number;
  poleEnd: number;
  onClose: () => void;
  onSaved?: (defect: DefectRecord) => void;
}

/**
 * Исправление ошибочно внесённого дефекта: место (опора или пролёты), вид дефекта,
 * фаза, число изоляторов, дата и кто обнаружил. Доступно с правом «Редактировать дефекты»,
 * пока дефект не устранён (проверяется и на сервере).
 */
export const EditDefectModal = memo(({ defect, poleStart, poleEnd, onClose, onSaved }: EditDefectModalProps) => {
  const { data: elements    = [] } = useGetElementsQuery();
  const { data: defectTypes = [] } = useGetDefectTypesQuery();
  const { data: phases      = [] } = useGetPhasesQuery();
  const [editDefect, { isLoading }] = useEditDefectMutation();

  const [mode,      setMode]      = useState<'pole' | 'span'>('pole');
  const [pole,      setPole]      = useState('');
  const [span,      setSpan]      = useState('');
  const [defectId,  setDefectId]  = useState<number | null>(null);
  const [phaseId,   setPhaseId]   = useState<number | ''>('');
  const [insulators, setInsulators] = useState<number | ''>('');
  const [dateFound, setDateFound] = useState('');
  const [inspector, setInspector] = useState('');
  const [error,     setError]     = useState('');

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
  }, [defect]);

  const selectedDefect  = useMemo(() => defectTypes.find((d) => d.id === defectId), [defectTypes, defectId]);
  const selectedElement = useMemo(
    () => elements.find((e) => selectedDefect && e.id === selectedDefect.elementId),
    [elements, selectedDefect],
  );
  const phaseOptions = useMemo<SelectOption<number>[]>(
    () => phases.map((p) => ({ value: p.id, label: capitalizeFirst(p.name) })),
    [phases],
  );

  const poleNum   = Number(pole.trim());
  const poleOk    = mode === 'pole' && Number.isInteger(poleNum) && poleNum >= poleStart && poleNum <= poleEnd;
  const spanOk    = mode === 'span' && isSpanValid(span, poleStart, poleEnd);
  const locationInvalid = mode === 'pole' ? !!pole.trim() && !poleOk : !!span.trim() && !spanOk;
  const isValid   = (poleOk || spanOk) && defectId != null && !!dateFound && inspector.trim().length > 0;

  const handlePick = useCallback((d: DefectType) => setDefectId(d.id), []);

  const handleSave = useCallback(async () => {
    if (!defect || !isValid || defectId == null) return;
    setError('');
    try {
      const saved = await editDefect({
        id:             defect.id,
        poleNumber:     mode === 'pole' ? poleNum : 0,
        spanRange:      mode === 'span' ? span.trim() : null,
        defectId,
        phaseId:        phaseId === '' ? null : phaseId,
        insulatorCount: insulators === '' ? null : insulators,
        dateFound,
        inspectorFind:  inspector.trim(),
      }).unwrap();
      toast.success('Дефект исправлен');
      onSaved?.(saved);
      onClose();
    } catch (e: unknown) {
      const msg = (e as { data?: { error?: string } })?.data?.error;
      setError(msg ?? 'Не удалось сохранить изменения');
    }
  }, [dateFound, defect, defectId, editDefect, insulators, inspector, isValid, mode, onClose, onSaved, phaseId, poleNum, span]);

  return (
    <Modal
      isOpen={!!defect}
      onClose={onClose}
      title='Исправить дефект'
      size='m'
      footer={
        <>
          <Button variant='secondary' onClick={onClose}>Отмена</Button>
          <Button variant='primary' onClick={handleSave} disabled={!isValid} loading={isLoading}>Сохранить</Button>
        </>
      }
    >
      <div className={cls.form}>
        {error && <div className={cls.error} role='alert'>{error}</div>}

        <FormField
          label='Опора / Пролёт'
          htmlFor='edit-location'
          error={locationInvalid
            ? (mode === 'pole' ? `Опора от ${poleStart} до ${poleEnd}` : `Пролёты от ${poleStart} до ${poleEnd}, например 3-7`)
            : undefined}
        >
          <div className={cls.locationRow}>
            <div className={cls.modeToggle}>
              <button type='button' className={mode === 'pole' ? cls.modeActive : cls.mode} onClick={() => setMode('pole')}>Опора</button>
              <button type='button' className={mode === 'span' ? cls.modeActive : cls.mode} onClick={() => setMode('span')}>Пролёты</button>
            </div>
            <Input
              id='edit-location'
              inputMode='tel'
              autoComplete='off'
              placeholder={`${poleStart}–${poleEnd}`}
              value={mode === 'pole' ? pole : span}
              onChange={mode === 'pole' ? setPole : setSpan}
              invalid={locationInvalid}
            />
          </div>
        </FormField>

        <FormField label='Элемент / дефект'>
          <DefectPicker
            elements={elements}
            defectTypes={defectTypes}
            selectedDefect={selectedDefect}
            selectedElement={selectedElement}
            onSelect={handlePick}
            onClear={() => setDefectId(null)}
          />
        </FormField>

        <div className={cls.row}>
          <FormField label='Фаза' htmlFor='edit-phase' optional>
            <Select<number>
              id='edit-phase'
              options={phaseOptions}
              value={phaseId}
              placeholder='—'
              onChange={setPhaseId}
            />
          </FormField>
          <FormField label='Изоляторов, шт.' htmlFor='edit-insulators' optional>
            <Select<number>
              id='edit-insulators'
              options={INSULATOR_OPTIONS}
              value={insulators}
              placeholder='—'
              onChange={setInsulators}
            />
          </FormField>
        </div>

        <div className={cls.row}>
          <FormField label='Дата обнаружения' htmlFor='edit-date'>
            <Input id='edit-date' type='date' value={dateFound} onChange={setDateFound} />
          </FormField>
          <FormField label='Обнаружил' htmlFor='edit-inspector'>
            <Input
              id='edit-inspector'
              autoComplete='off'
              value={inspector}
              onChange={setInspector}
              placeholder='Фамилия И.О.'
            />
          </FormField>
        </div>
      </div>
    </Modal>
  );
});

EditDefectModal.displayName = 'EditDefectModal';
