import { memo } from 'react';
import { FormField, Input, SegmentedControl } from '@/shared/ui';
import type { LocationMode } from '../model/addDefectSlice';
import cls from './EditDefectModal.module.scss';

interface EditDefectLocationFieldProps {
  mode: LocationMode;
  setMode: (mode: LocationMode) => void;
  pole: string;
  setPole: (value: string) => void;
  span: string;
  setSpan: (value: string) => void;
  poleStart: number;
  poleEnd: number;
  locationInvalid: boolean;
}

/** Место дефекта: опора или пролёты. */
export const EditDefectLocationField = memo(({
  mode,
  setMode,
  pole,
  setPole,
  span,
  setSpan,
  poleStart,
  poleEnd,
  locationInvalid,
}: EditDefectLocationFieldProps) => (
  <FormField
    label='Опора / Пролёт'
    htmlFor='edit-location'
    error={locationInvalid
      ? (mode === 'pole' ? `Опора от ${poleStart} до ${poleEnd}` : `Пролёты от ${poleStart} до ${poleEnd}, например 3-7`)
      : undefined}
  >
    <div className={cls.locationRow}>
      <SegmentedControl<LocationMode>
        aria-label='Режим места'
        options={[
          { value: 'pole', label: 'Опора' },
          { value: 'span', label: 'Пролёты' },
        ]}
        value={mode}
        onChange={setMode}
      />
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
));

EditDefectLocationField.displayName = 'EditDefectLocationField';
