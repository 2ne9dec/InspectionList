import { memo } from 'react';
import { Button, FormField, HStack, Input } from '@/shared/ui';
import { useAddDefectBar } from '../model/useAddDefectBar';
import { DefectPicker } from './DefectPicker';
import { QuickDefectChips } from './QuickDefectChips';
import { AddDefectLocationField } from './AddDefectLocationField';
import { AddDefectAttributes } from './AddDefectAttributes';
import cls from './AddDefectBar.module.scss';

interface AddDefectBarProps {
  sheetId: number;
  poleStart: number;
  poleEnd: number;
  sheetDate?: string;
  sheetInspector?: string;
}

export const AddDefectBar = memo(({ sheetId, poleStart, poleEnd, sheetDate, sheetInspector }: AddDefectBarProps) => {
  const {
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
  } = useAddDefectBar({ sheetId, poleStart, poleEnd, sheetDate, sheetInspector });

  return (
    <HStack gap='2' align='end' wrap='wrap' className={cls.bar}>
      <div className={cls.dateField}>
        <FormField label='Дата' htmlFor='add-date'>
          <Input
            id='add-date'
            name='dateFound'
            type='date'
            value={dateFound}
            onChange={setDateFound}
          />
        </FormField>
      </div>

      <div className={cls.inspectorField}>
        <FormField label='Обнаружил' htmlFor='add-inspector'>
          <Input
            id='add-inspector'
            name='inspector'
            value={inspector}
            title={inspector || undefined}
            placeholder='Иванов И.И.'
            onChange={setInspector}
          />
        </FormField>
      </div>

      <AddDefectLocationField
        mode={mode}
        setMode={setMode}
        poleNumber={poleNumber}
        setPoleNumber={setPoleNumber}
        spanRange={spanRange}
        setSpanRange={setSpanRange}
        poleStart={poleStart}
        poleEnd={poleEnd}
        maxSpan={maxSpan}
        poleInvalid={poleInvalid}
        spanInvalid={spanInvalid}
      />

      <DefectPicker
        elements={elements}
        defectTypes={defectTypes}
        selectedDefect={selectedDefect}
        selectedElement={selectedElement}
        customValue={customName}
        onSelect={handlePickDefect}
        onClear={clearDefectSelection}
      />

      {needsCustomName && (
        <div className={cls.customField}>
          <FormField label='Свой дефект' htmlFor='add-custom-name'>
            <Input
              id='add-custom-name'
              name='customName'
              value={customName}
              onChange={setCustomName}
              autofocus
              placeholder='Опишите дефект линейной арматуры'
              maxLength={200}
              invalid={customName.trim().length === 0}
            />
          </FormField>
        </div>
      )}

      <AddDefectAttributes
        phases={phases}
        selectedPhaseIds={selectedPhaseIds}
        setPhaseIds={setPhaseIds}
        garlandNumber={garlandNumber}
        setGarlandNumber={setGarlandNumber}
        insulatorCount={insulatorCount}
        setInsulatorCount={setInsulatorCount}
      />

      <div className={cls.submitWrap}>
        <Button
          variant='primary'
          size='m'
          onClick={handleSubmit}
          disabled={!isValid}
          loading={isLoading}
        >
          + Добавить
        </Button>
      </div>

      <QuickDefectChips
        topDefects={topDefects}
        elements={elements}
        selectedDefectId={selectedDefectId}
        onSelect={handlePickDefect}
      />
    </HStack>
  );
});

AddDefectBar.displayName = 'AddDefectBar';
