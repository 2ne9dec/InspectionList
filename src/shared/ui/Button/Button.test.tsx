import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
  it('рендерит подпись и вызывает onClick', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(<Button onClick={onClick}>Сохранить</Button>);
    await user.click(screen.getByRole('button', { name: 'Сохранить' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('по умолчанию имеет type="button"', () => {
    render(<Button>Кнопка</Button>);

    expect(screen.getByRole('button', { name: 'Кнопка' })).toHaveAttribute(
      'type',
      'button',
    );
  });

  it('позволяет задать type="submit"', () => {
    render(<Button type='submit'>Отправить</Button>);

    expect(screen.getByRole('button', { name: 'Отправить' })).toHaveAttribute(
      'type',
      'submit',
    );
  });

  it('не вызывает onClick в состоянии disabled', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(
      <Button disabled onClick={onClick}>
        Недоступно
      </Button>,
    );
    await user.click(screen.getByRole('button', { name: 'Недоступно' }));

    expect(onClick).not.toHaveBeenCalled();
  });

  it('в состоянии loading блокируется и сообщает aria-busy', () => {
    render(<Button loading>Сохраняем</Button>);
    const button = screen.getByRole('button', { name: 'Сохраняем' });

    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });

  it('скрывает иконки в состоянии loading', () => {
    render(
      <Button
        loading
        leftIcon={<span data-testid='left-icon' />}
        rightIcon={<span data-testid='right-icon' />}
      >
        Загрузка
      </Button>,
    );

    expect(screen.queryByTestId('left-icon')).not.toBeInTheDocument();
    expect(screen.queryByTestId('right-icon')).not.toBeInTheDocument();
  });

  it('показывает иконки слева и справа от подписи', () => {
    render(
      <Button
        leftIcon={<span data-testid='left-icon' />}
        rightIcon={<span data-testid='right-icon' />}
      >
        Кнопка
      </Button>,
    );

    expect(screen.getByTestId('left-icon')).toBeInTheDocument();
    expect(screen.getByTestId('right-icon')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Кнопка' })).toBeInTheDocument();
  });

  it('прокидывает ref на DOM-кнопку', () => {
    const ref = createRef<HTMLButtonElement>();

    render(<Button ref={ref}>Кнопка</Button>);

    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it('добавляет пользовательский className', () => {
    render(<Button className='custom-class'>Кнопка</Button>);

    expect(screen.getByRole('button', { name: 'Кнопка' })).toHaveClass(
      'custom-class',
    );
  });
});
