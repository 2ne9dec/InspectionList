import { memo } from 'react';
import type { SelectOption } from '@/shared/ui';
import { FormField, Select } from '@/shared/ui';
import cls from './EditDefectModal.module.scss';

const INSULATOR_OPTIONS: SelectOption<number>[] =
  Array.from({ length: 24 }, (_, i) => ({ value: i + 1, label: String(i + 1) }));

interface EditDefectAttributesProps {
  phaseOptions: SelectOption<number>[];
  phaseId: number | '';
  setPhaseId: (value: number | '') => void;
  insulators: number | '';
  setInsulators: (value: number | '') => void;
}

/** Необязательные атрибуты дефекта: фаза и число изоляторов. */
export const EditDefectAttributes = memo(({
  phaseOptions,
  phaseId,
  setPhaseId,
  insulators,
  setInsulators,
}: EditDefectAttributesProps) => (
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
));

EditDefectAttributes.displayName = 'EditDefectAttributes';
