import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PasswordInput } from './PasswordInput';

describe('PasswordInput', () => {
  it('по умолчанию скрывает пароль', () => {
    render(<PasswordInput aria-label='Пароль' value='secret' onChange={vi.fn()} />);

    expect(screen.getByLabelText('Пароль')).toHaveAttribute('type', 'password');
  });

  it('показывает пароль, пока кнопка зажата', () => {
    render(<PasswordInput aria-label='Пароль' value='secret' onChange={vi.fn()} />);
    const input = screen.getByLabelText('Пароль');
    const toggle = screen.getByRole('button', { name: /Показать пароль/ });

    fireEvent.pointerDown(toggle);
    expect(input).toHaveAttribute('type', 'text');

    fireEvent.pointerUp(toggle);
    expect(input).toHaveAttribute('type', 'password');
  });

  it('снова скрывает пароль, когда курсор уходит с кнопки', () => {
    render(<PasswordInput aria-label='Пароль' value='secret' onChange={vi.fn()} />);
    const input = screen.getByLabelText('Пароль');
    const toggle = screen.getByRole('button', { name: /Показать пароль/ });

    fireEvent.pointerDown(toggle);
    expect(input).toHaveAttribute('type', 'text');

    fireEvent.pointerLeave(toggle);
    expect(input).toHaveAttribute('type', 'password');
  });

  it('не попадает в порядок табуляции', () => {
    render(<PasswordInput aria-label='Пароль' value='' onChange={vi.fn()} />);

    expect(
      screen.getByRole('button', { name: /Показать пароль/ }),
    ).toHaveAttribute('tabindex', '-1');
  });

  it('передаёт ввод в onChange', () => {
    const onChange = vi.fn();
    render(<PasswordInput aria-label='Пароль' value='' onChange={onChange} />);

    fireEvent.change(screen.getByLabelText('Пароль'), {
      target: { value: 'qwerty' },
    });

    expect(onChange).toHaveBeenCalledWith('qwerty');
  });
});
