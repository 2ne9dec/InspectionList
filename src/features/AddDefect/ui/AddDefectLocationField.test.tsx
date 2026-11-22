import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AddDefectLocationField } from './AddDefectLocationField';

function setup(overrides: Partial<React.ComponentProps<typeof AddDefectLocationField>> = {}) {
  const props = {
    mode: 'pole' as const,
    setMode: vi.fn(),
    poleNumber: '5',
    setPoleNumber: vi.fn(),
    spanRange: '',
    setSpanRange: vi.fn(),
    poleStart: 1,
    poleEnd: 10,
    maxSpan: 10,
    poleInvalid: false,
    spanInvalid: false,
    ...overrides,
  };
  render(<AddDefectLocationField {...props} />);
  return props;
}

describe('AddDefectLocationField', () => {
  it('показывает режим опоры и текущий номер', () => {
    setup();

    expect(screen.getByLabelText(/опора.*пролёт/i)).toHaveValue('5');
    expect(screen.getByRole('button', { name: 'Оп.' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('увеличивает и уменьшает номер опоры', () => {
    const props = setup({ poleNumber: '5' });

    fireEvent.click(screen.getByRole('button', { name: '+' }));
    expect(props.setPoleNumber).toHaveBeenLastCalledWith('6');

    fireEvent.click(screen.getByRole('button', { name: '−' }));
    expect(props.setPoleNumber).toHaveBeenLastCalledWith('4');
  });

  it('ограничивает шаг границами линии', () => {
    const props = setup({ poleNumber: '10' });
    fireEvent.click(screen.getByRole('button', { name: '+' }));
    expect(props.setPoleNumber).toHaveBeenLastCalledWith('10');
  });

  it('блокирует шаг для нескольких опор', () => {
    setup({ poleNumber: '5,6' });
    expect(screen.getByRole('button', { name: '+' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '−' })).toBeDisabled();
  });

  it('переключает режим на пролёты', () => {
    const props = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Пр.' }));
    expect(props.setMode).toHaveBeenCalledWith('span');
  });

  it('показывает ошибку пролёта', () => {
    setup({ mode: 'span', spanRange: '20-25', spanInvalid: true });
    expect(screen.getByText(/макс\. пролёт: 10/i)).toBeInTheDocument();
  });
});
