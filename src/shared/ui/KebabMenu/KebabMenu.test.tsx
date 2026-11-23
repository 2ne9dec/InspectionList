import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { KebabMenu } from './KebabMenu';
import type { KebabMenuItem } from './KebabMenu';

function makeItems(overrides: {
  onEdit?: () => void;
  onDelete?: () => void;
  onArchive?: () => void;
} = {}): KebabMenuItem[] {
  return [
    {
      id: 'edit',
      label: 'Редактировать',
      onClick: overrides.onEdit ?? vi.fn(),
    },
    {
      id: 'delete',
      label: 'Удалить',
      danger: true,
      onClick: overrides.onDelete ?? vi.fn(),
    },
    {
      id: 'archive',
      label: 'Архив',
      disabled: true,
      onClick: overrides.onArchive ?? vi.fn(),
    },
  ];
}

describe('KebabMenu', () => {
  it('открывает меню по клику на кнопку', async () => {
    const user = userEvent.setup();
    render(<KebabMenu items={makeItems()} />);

    const trigger = screen.getByRole('button', { name: 'Действия' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await user.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getAllByRole('menuitem')).toHaveLength(3);
  });

  it('вызывает обработчик пункта и закрывает меню', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    render(<KebabMenu items={makeItems({ onEdit })} />);

    await user.click(screen.getByRole('button', { name: 'Действия' }));
    await user.click(
      within(screen.getByRole('menu')).getByRole('menuitem', {
        name: 'Редактировать',
      }),
    );

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('не вызывает обработчик disabled-пункта', async () => {
    const user = userEvent.setup();
    const onArchive = vi.fn();
    render(<KebabMenu items={makeItems({ onArchive })} />);

    await user.click(screen.getByRole('button', { name: 'Действия' }));
    const archive = screen.getByRole('menuitem', { name: 'Архив' });

    expect(archive).toBeDisabled();
    await user.click(archive);

    expect(onArchive).not.toHaveBeenCalled();
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('закрывается по Escape', async () => {
    const user = userEvent.setup();
    render(<KebabMenu items={makeItems()} />);

    await user.click(screen.getByRole('button', { name: 'Действия' }));
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('закрывается по клику вне меню', async () => {
    const user = userEvent.setup();
    render(<KebabMenu items={makeItems()} />);

    await user.click(screen.getByRole('button', { name: 'Действия' }));
    fireEvent.mouseDown(document.body);

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('использует кастомный aria-label для кнопки', async () => {
    const user = userEvent.setup();
    render(<KebabMenu items={makeItems()} ariaLabel='Действия со строкой' />);

    await user.click(
      screen.getByRole('button', { name: 'Действия со строкой' }),
    );

    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('рендерит иконки пунктов', async () => {
    const user = userEvent.setup();
    render(
      <KebabMenu
        items={[
          {
            id: 'icon',
            label: 'С иконкой',
            icon: <span data-testid='item-icon' />,
            onClick: vi.fn(),
          },
        ]}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Действия' }));

    expect(screen.getByTestId('item-icon')).toBeInTheDocument();
  });
});
