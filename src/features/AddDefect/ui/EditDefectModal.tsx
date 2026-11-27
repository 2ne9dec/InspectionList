import { memo } from 'react';
import type { DefectRecord, DefectRecordFull } from '@/entities/DefectRecord';
import { Button, FormField, Input, Modal } from '@/shared/ui';
import { useEditDefectForm } from '../model/useEditDefectForm';
import { DefectPicker } from './DefectPicker';
import { EditDefectAttributes } from './EditDefectAttributes';
import { EditDefectLocationField } from './EditDefectLocationField';
import cls from './EditDefectModal.module.scss';

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
export const EditDefectModal = memo((props: EditDefectModalProps) => {
  const { defect, poleStart, poleEnd, onClose, onSaved } = props;

  const {
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
  } = useEditDefectForm({ defect, poleStart, poleEnd, onClose, onSaved });

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

        <EditDefectLocationField
          mode={mode}
          setMode={setMode}
          pole={pole}
          setPole={setPole}
          span={span}
          setSpan={setSpan}
          poleStart={poleStart}
          poleEnd={poleEnd}
          locationInvalid={locationInvalid}
        />

        <FormField label='Элемент / дефект' htmlFor='edit-defect'>
          <DefectPicker
            id='edit-defect'
            elements={elements}
            defectTypes={defectTypes}
            selectedDefect={selectedDefect}
            selectedElement={selectedElement}
            customValue={customName}
            onSelect={handlePick}
            onClear={() => setDefectId(null)}
          />
        </FormField>

        {needsCustomName && (
          <FormField label='Свой дефект' htmlFor='edit-custom-name'>
            <Input
              id='edit-custom-name'
              value={customName}
              onChange={setCustomName}
              placeholder='Опишите дефект линейной арматуры'
              maxLength={200}
              invalid={customName.trim().length === 0}
            />
          </FormField>
        )}

        <EditDefectAttributes
          phaseOptions={phaseOptions}
          phaseId={phaseId}
          setPhaseId={setPhaseId}
          insulators={insulators}
          setInsulators={setInsulators}
        />

        <div className={cls.row}>
          <FormField label='Дата обнаружения' htmlFor='edit-date'>
            <Input id='edit-date' type='date' value={dateFound} onChange={setDateFound} />
          </FormField>
          <FormField label='Обнаружил' htmlFor='edit-inspector'>
            <Input
              id='edit-inspector'
              autoComplete='off'
              value={inspector}
              title={inspector || undefined}
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
