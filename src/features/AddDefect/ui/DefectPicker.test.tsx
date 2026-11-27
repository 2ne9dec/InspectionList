import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { FormField } from '@/shared/ui';
import type { DefectType, Element } from '@/entities/InspectionLine';
import { DefectPicker } from './DefectPicker';

const elements: Element[] = [{ id: 1, name: 'Опора' }];
const defectTypes: DefectType[] = [{ id: 10, name: 'Скол', elementId: 1 }];

describe('DefectPicker', () => {
  it('связывает label с кнопкой пикера по id', () => {
    render(
      <FormField label='Дефект' htmlFor='defect-picker'>
        <DefectPicker
          id='defect-picker'
          elements={elements}
          defectTypes={defectTypes}
          selectedDefect={undefined}
          selectedElement={undefined}
          onSelect={vi.fn()}
          onClear={vi.fn()}
        />
      </FormField>,
    );

    expect(screen.getByLabelText('Дефект')).toHaveAttribute('id', 'defect-picker');
  });

  it('показывает выбранный дефект', () => {
    render(
      <DefectPicker
        elements={elements}
        defectTypes={defectTypes}
        selectedDefect={defectTypes[0]}
        selectedElement={elements[0]}
        onSelect={vi.fn()}
        onClear={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /Скол/ })).toHaveTextContent('Скол');
  });
});
