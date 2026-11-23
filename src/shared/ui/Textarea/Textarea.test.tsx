import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Textarea } from './Textarea';

function ControlledTextarea() {
  const [value, setValue] = useState('');
  return <Textarea aria-label='Примечание' value={value} onChange={(e) => setValue(e.target.value)} />;
}

describe('Textarea', () => {
  it('принимает ввод и отдаёт значение через onChange', async () => {
    const user = userEvent.setup();
    render(<ControlledTextarea />);

    const textarea = screen.getByRole('textbox', { name: 'Примечание' });
    await user.type(textarea, 'Требуется замена');

    expect(textarea).toHaveValue('Требуется замена');
  });

  it('выставляет aria-invalid при ошибке', () => {
    render(<Textarea aria-label='Примечание' invalid />);

    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
  });

  it('не выставляет aria-invalid без ошибки', () => {
    render(<Textarea aria-label='Примечание' />);

    expect(screen.getByRole('textbox')).not.toHaveAttribute('aria-invalid');
  });

  it('передаёт placeholder и rows', () => {
    render(<Textarea aria-label='Примечание' placeholder='Комментарий' rows={5} />);

    const textarea = screen.getByPlaceholderText('Комментарий');
    expect(textarea).toHaveAttribute('rows', '5');
  });

  it('прокидывает ref на DOM-textarea', () => {
    const ref = createRef<HTMLTextAreaElement>();

    render(<Textarea ref={ref} aria-label='Примечание' />);

    expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
  });

  it('добавляет пользовательский className', () => {
    render(<Textarea aria-label='Примечание' className='custom-textarea' />);

    expect(screen.getByRole('textbox')).toHaveClass('custom-textarea');
  });

  it('вызывает onKeyDown', async () => {
    const user = userEvent.setup();
    const onKeyDown = vi.fn();
    render(<Textarea aria-label='Примечание' onKeyDown={onKeyDown} />);

    await user.type(screen.getByRole('textbox'), '{Enter}');

    expect(onKeyDown).toHaveBeenCalled();
  });
});
