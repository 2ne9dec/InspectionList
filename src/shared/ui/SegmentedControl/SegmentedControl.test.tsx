import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { SegmentedControl } from './SegmentedControl';

describe('SegmentedControl', () => {
  it('показывает активный сегмент и передаёт новое значение', () => {
    const onChange = vi.fn();

    render(
      <SegmentedControl
        aria-label='Режим'
        options={[
          { value: 'pole', label: 'Опора' },
          { value: 'span', label: 'Пролёты' },
        ]}
        value='pole'
        onChange={onChange}
      />,
    );

    const pole = screen.getByRole('button', { name: 'Опора' });
    const span = screen.getByRole('button', { name: 'Пролёты' });

    expect(pole).toHaveAttribute('aria-pressed', 'true');
    expect(span).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(span);
    expect(onChange).toHaveBeenCalledWith('span');
  });
});
