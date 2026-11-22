import { memo, useCallback } from 'react';
import { FormField, Input, SegmentedControl } from '@/shared/ui';
import type { LocationMode } from '../model/addDefectSlice';
import cls from './AddDefectBar.module.scss';

interface AddDefectLocationFieldProps {
  mode: LocationMode;
  setMode: (mode: LocationMode) => void;
  poleNumber: string;
  setPoleNumber: (value: string) => void;
  spanRange: string;
  setSpanRange: (value: string) => void;
  poleStart: number;
  poleEnd: number;
  maxSpan: number;
  poleInvalid: boolean;
  spanInvalid: boolean;
}

/** Поле «Опора / Пролёт» с переключателем режима и шагом по опорам. */
export const AddDefectLocationField = memo(({
  mode,
  setMode,
  poleNumber,
  setPoleNumber,
  spanRange,
  setSpanRange,
  poleStart,
  poleEnd,
  maxSpan,
  poleInvalid,
  spanInvalid,
}: AddDefectLocationFieldProps) => {
  const isMultiPole = mode === 'pole' && poleNumber.includes(',');

  const handlePoleStep = useCallback(
    (delta: number) => {
      if (mode !== 'pole') return;
      // Работает только если одна опора без запятых.
      const cur = Number.parseInt(poleNumber, 10);
      const next = Number.isFinite(cur) ? cur + delta : delta > 0 ? poleStart : poleEnd;
      const clamped = Math.min(poleEnd, Math.max(poleStart, next));
      setPoleNumber(String(clamped));
    },
    [mode, poleNumber, poleStart, poleEnd, setPoleNumber],
  );

  return (
    <div className={cls.locationField}>
      <FormField label='Опора / Пролёт' htmlFor='add-location'>
        <div className={cls.locationRow}>
          <SegmentedControl<LocationMode>
            aria-label='Режим места'
            options={[
              { value: 'pole', label: 'Оп.' },
              { value: 'span', label: 'Пр.' },
            ]}
            value={mode}
            onChange={setMode}
          />
          <div className={cls.stepWrap}>
            <button
              type='button'
              className={cls.stepBtn}
              style={mode !== 'pole' ? { visibility: 'hidden' } : undefined}
              onClick={() => handlePoleStep(-1)}
              tabIndex={-1}
              disabled={isMultiPole}
            >−</button>
            <Input
              id='add-location'
              name='location'
              inputMode='tel'
              placeholder={mode === 'pole' ? `${poleStart}–${poleEnd}` : `${poleStart}–${maxSpan}`}
              value={mode === 'pole' ? poleNumber : spanRange}
              onChange={mode === 'pole' ? setPoleNumber : setSpanRange}
              invalid={poleInvalid || spanInvalid}
              className={cls.stepInput}
            />
            <button
              type='button'
              className={cls.stepBtn}
              style={mode !== 'pole' ? { visibility: 'hidden' } : undefined}
              onClick={() => handlePoleStep(1)}
              tabIndex={-1}
              disabled={isMultiPole}
            >+</button>
          </div>
        </div>
        {spanInvalid && (
          <span className={cls.fieldError}>
            Макс. пролёт: {maxSpan}
          </span>
        )}
      </FormField>
    </div>
  );
});
AddDefectLocationField.displayName = 'AddDefectLocationField';
