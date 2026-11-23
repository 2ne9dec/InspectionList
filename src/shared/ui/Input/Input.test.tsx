import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Input } from './Input';

function ControlledInput() {
  const [value, setValue] = useState('');
  return <Input label='Имя' value={value} onChange={setValue} />;
}

describe('Input', () => {
  it('связывает label с инпутом', () => {
    render(<Input label='Имя' value='' onChange={vi.fn()} />);

    const input = screen.getByLabelText('Имя');
    expect(input).toBeInstanceOf(HTMLInputElement);
  });

  it('вызывает onChange со строковым значением и обновляет значение', async () => {
    const user = userEvent.setup();
    render(<ControlledInput />);

    const input = screen.getByLabelText('Имя');
    await user.type(input, 'Опора');

    expect(input).toHaveValue('Опора');
  });

  it('передаёт значение из onChange', () => {
    const onChange = vi.fn();
    render(<Input label='Имя' value='' onChange={onChange} />);

    fireEvent.change(screen.getByLabelText('Имя'), { target: { value: 'abc' } });

    expect(onChange).toHaveBeenCalledWith('abc');
  });

  it('связывает hint с инпутом через aria-describedby', () => {
    render(<Input label='Имя' hint='Введите ФИО' value='' onChange={vi.fn()} />);

    const input = screen.getByLabelText('Имя');
    expect(input).toHaveAccessibleDescription('Введите ФИО');
    expect(screen.getByText('Введите ФИО')).toHaveAttribute(
      'id',
      input.getAttribute('aria-describedby'),
    );
  });

  it('сообщает об ошибке через aria-invalid', () => {
    render(
      <Input
        label='Имя'
        hint='Обязательное поле'
        invalid
        value=''
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByLabelText('Имя')).toHaveAttribute('aria-invalid', 'true');
  });

  it('не выставляет aria-invalid для валидного поля', () => {
    render(<Input label='Имя' value='' onChange={vi.fn()} />);

    expect(screen.getByLabelText('Имя')).not.toHaveAttribute('aria-invalid');
  });

  it('передаёт readonly в нативный инпут', () => {
    render(<Input label='Имя' readonly value='Иван' onChange={vi.fn()} />);

    const input = screen.getByLabelText('Имя');
    expect(input).toHaveAttribute('readonly');
    expect(input).toHaveValue('Иван');
  });

  it('фокусирует инпут при autofocus', () => {
    render(<Input label='Имя' autofocus value='' onChange={vi.fn()} />);

    expect(screen.getByLabelText('Имя')).toHaveFocus();
  });

  it('рендерит rightSlot', () => {
    render(
      <Input
        label='Имя'
        value=''
        onChange={vi.fn()}
        rightSlot={<span data-testid='slot'>слот</span>}
      />,
    );

    expect(screen.getByTestId('slot')).toBeInTheDocument();
  });

  it('выводит числовое значение как строку', () => {
    render(<Input label='Номер' value={42} onChange={vi.fn()} />);

    expect(screen.getByLabelText('Номер')).toHaveDisplayValue('42');
  });

  it('вызывает onKeyDown', () => {
    const onKeyDown = vi.fn();
    render(
      <Input label='Имя' value='' onChange={vi.fn()} onKeyDown={onKeyDown} />,
    );

    fireEvent.keyDown(screen.getByLabelText('Имя'), { key: 'Enter' });

    expect(onKeyDown).toHaveBeenCalledTimes(1);
  });

  it('прокидывает ref на DOM-инпут', () => {
    const ref = createRef<HTMLInputElement>();

    render(<Input ref={ref} label='Имя' value='' onChange={vi.fn()} />);

    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });
});
