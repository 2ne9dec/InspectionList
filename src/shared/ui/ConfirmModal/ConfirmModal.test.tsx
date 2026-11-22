import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmModal } from './ConfirmModal';

describe('ConfirmModal', () => {
  it('ничего не рендерит в закрытом состоянии', () => {
    render(
      <ConfirmModal
        isOpen={false}
        title='Удалить запись?'
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('показывает заголовок, описание и фокусирует подтверждение', () => {
    render(
      <ConfirmModal
        isOpen
        title='Удалить запись?'
        description='Действие нельзя отменить'
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    const dialog = screen.getByRole('alertdialog', { name: 'Удалить запись?' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleDescription('Действие нельзя отменить');
    expect(screen.getByRole('button', { name: 'Подтвердить' })).toHaveFocus();
  });

  it('вызывает onConfirm по кнопке подтверждения', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <ConfirmModal
        isOpen
        title='Удалить?'
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Подтвердить' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('вызывает onCancel по кнопке отмены', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(
      <ConfirmModal
        isOpen
        title='Удалить?'
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Отмена' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('вызывает onCancel по Escape', () => {
    const onCancel = vi.fn();
    render(
      <ConfirmModal
        isOpen
        title='Удалить?'
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    );

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('вызывает onCancel по клику на оверлей, но не по клику внутри диалога', () => {
    const onCancel = vi.fn();
    render(
      <ConfirmModal
        isOpen
        title='Удалить?'
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    );

    fireEvent.click(screen.getByRole('alertdialog'));
    expect(onCancel).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('presentation'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('использует кастомные подписи кнопок', () => {
    render(
      <ConfirmModal
        isOpen
        title='Удалить?'
        confirmLabel='Да, удалить'
        cancelLabel='Оставить'
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('button', { name: 'Да, удалить' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Оставить' })).toBeInTheDocument();
  });

  it('не требует описания', () => {
    render(
      <ConfirmModal
        isOpen
        title='Готово?'
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByRole('alertdialog')).not.toHaveAttribute(
      'aria-describedby',
    );
  });
});
