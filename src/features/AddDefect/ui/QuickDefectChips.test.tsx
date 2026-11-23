import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { DefectType, Element } from '@/entities/InspectionLine';
import { QuickDefectChips } from './QuickDefectChips';

const elements: Element[] = [
  { id: 1, name: 'Изолятор' },
  { id: 2, name: 'Траверса' },
];

const defects: DefectType[] = [
  { id: 10, name: 'Разрушен', elementId: 1 },
  { id: 20, name: 'Загрязнён', elementId: 2 },
];

describe('QuickDefectChips', () => {
  it('ничего не рендерит без частых дефектов', () => {
    const { container } = render(
      <QuickDefectChips topDefects={[]} elements={elements} selectedDefectId={null} onSelect={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('показывает элемент и название дефекта', () => {
    render(
      <QuickDefectChips topDefects={defects} elements={elements} selectedDefectId={null} onSelect={vi.fn()} />,
    );

    expect(screen.getByRole('button', { name: 'Изолятор: Разрушен' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Траверса: Загрязнён' })).toBeInTheDocument();
  });

  it('передаёт выбранный дефект', () => {
    const onSelect = vi.fn();
    render(
      <QuickDefectChips
        topDefects={defects}
        elements={elements}
        selectedDefectId={10}
        onSelect={onSelect}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Траверса: Загрязнён' }));
    expect(onSelect).toHaveBeenCalledWith(defects[1]);
  });
});
