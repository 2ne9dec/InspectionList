import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Checkbox } from './Checkbox';

describe('Checkbox', () => {
  it('переключается и вызывает onChange', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<Checkbox aria-label='Выбрать опору' onChange={onChange} />);
    const checkbox = screen.getByRole('checkbox', { name: 'Выбрать опору' });

    expect(checkbox).not.toBeChecked();

    await user.click(checkbox);

    expect(checkbox).toBeChecked();
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('отражает controlled-состояние checked', () => {
    render(<Checkbox aria-label='Выбрано' checked readOnly />);

    expect(screen.getByRole('checkbox', { name: 'Выбрано' })).toBeChecked();
  });

  it('не переключается в состоянии disabled', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <Checkbox aria-label='Выбрать' disabled onChange={onChange} />,
    );
    const checkbox = screen.getByRole('checkbox', { name: 'Выбрать' });

    await user.click(checkbox);

    expect(checkbox).not.toBeChecked();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('прокидывает ref на DOM-чекбокс', () => {
    const ref = createRef<HTMLInputElement>();

    render(<Checkbox ref={ref} aria-label='Выбрать' />);

    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    expect(ref.current?.type).toBe('checkbox');
  });

  it('добавляет пользовательский className', () => {
    render(<Checkbox aria-label='Выбрать' className='custom-checkbox' />);

    expect(screen.getByRole('checkbox')).toHaveClass('custom-checkbox');
  });
});
