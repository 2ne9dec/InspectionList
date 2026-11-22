import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Dropdown } from './Dropdown';

function Harness() {
  return (
    <Dropdown
      trigger={({ open, toggle }) => (
        <button type='button' onClick={toggle} aria-expanded={open}>
          Открыть меню
        </button>
      )}
    >
      {({ close }) => (
        <div>
          <span>Содержимое панели</span>
          <button type='button' onClick={close}>
            Закрыть изнутри
          </button>
        </div>
      )}
    </Dropdown>
  );
}

describe('Dropdown', () => {
  it('открывает панель по клику на триггер', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Открыть меню' }));

    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByText('Содержимое панели')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Открыть меню' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('закрывает панель повторным кликом по триггеру', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const trigger = screen.getByRole('button', { name: 'Открыть меню' });

    await user.click(trigger);
    await user.click(trigger);

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('предоставляет дочернему рендеру функцию close', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'Открыть меню' }));
    await user.click(screen.getByRole('button', { name: 'Закрыть изнутри' }));

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('закрывается по Escape', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'Открыть меню' }));
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('закрывается по клику вне панели и триггера', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'Открыть меню' }));
    fireEvent.mouseDown(document.body);

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('не закрывается по клику внутри панели', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole('button', { name: 'Открыть меню' }));
    fireEvent.mouseDown(screen.getByText('Содержимое панели'));

    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('передаёт open в триггер и не рендерит панель в закрытом состоянии', async () => {
    const triggerSpy = vi.fn();
    const user = userEvent.setup();

    render(
      <Dropdown
        trigger={(api) => {
          triggerSpy(api.open);
          return (
            <button type='button' onClick={api.toggle}>
              Меню
            </button>
          );
        }}
      >
        {() => <span>Панель</span>}
      </Dropdown>,
    );

    await user.click(screen.getByRole('button', { name: 'Меню' }));

    expect(triggerSpy).toHaveBeenNthCalledWith(1, false);
    expect(triggerSpy).toHaveBeenCalledWith(true);
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });
});
