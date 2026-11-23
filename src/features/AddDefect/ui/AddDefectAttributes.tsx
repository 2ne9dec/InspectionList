import { memo } from 'react';
import { FormField, MultiSelect, SelectMenu } from '@/shared/ui';
import type { SelectOption } from '@/shared/ui';
import { capitalizeFirst } from '@/shared/lib/helpers';
import type { Phase } from '@/entities/InspectionLine';
import cls from './AddDefectBar.module.scss';

const GARLAND_CLEAR = { value: '', label: '—' };
const GARLAND_OPTIONS = [
  GARLAND_CLEAR,
  ...Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) })),
];
const INSULATOR_OPTIONS = [
  GARLAND_CLEAR,
  ...Array.from({ length: 24 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) })),
];

interface AddDefectAttributesProps {
  phases: ReadonlyArray<Phase>;
  selectedPhaseIds: number[];
  setPhaseIds: (ids: number[]) => void;
  garlandNumber: string;
  setGarlandNumber: (value: string) => void;
  insulatorCount: string;
  setInsulatorCount: (value: string) => void;
}

/** Фазы, гирлянда и количество изоляторов. */
export const AddDefectAttributes = memo(({
  phases,
  selectedPhaseIds,
  setPhaseIds,
  garlandNumber,
  setGarlandNumber,
  insulatorCount,
  setInsulatorCount,
}: AddDefectAttributesProps) => {
  const phaseOptions: SelectOption<number>[] = phases.map((p) => ({
    value: p.id,
    label: capitalizeFirst(p.name),
  }));

  return (
    <>
      {phases.length > 0 && (
        <div className={cls.smallField}>
          <FormField label='Фазы' htmlFor='add-phases'>
            <MultiSelect<number>
              id='add-phases'
              options={phaseOptions}
              values={selectedPhaseIds}
              onChange={setPhaseIds}
              placeholder='—'
            />
          </FormField>
        </div>
      )}

      <div className={cls.smallField}>
        <FormField label='Гирлянда' htmlFor='add-garland'>
          <SelectMenu
            id='add-garland'
            options={GARLAND_OPTIONS}
            value={garlandNumber}
            onChange={setGarlandNumber}
            placeholder='—'
          />
        </FormField>
      </div>

      <div className={cls.smallField}>
        <FormField label='Изол.' htmlFor='add-insulator-count'>
          <SelectMenu
            id='add-insulator-count'
            options={INSULATOR_OPTIONS}
            value={insulatorCount}
            onChange={setInsulatorCount}
            placeholder='—'
          />
        </FormField>
      </div>
    </>
  );
});
AddDefectAttributes.displayName = 'AddDefectAttributes';
