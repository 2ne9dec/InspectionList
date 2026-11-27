import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { vi } from 'vitest';
import { makeDefect } from '@tests/factories';
import { PoleGroupRow } from './PoleGroupRow';

function renderRow(props: Partial<ComponentProps<typeof PoleGroupRow>> = {}) {
  const onEdit = vi.fn();
  const onFix = vi.fn();
  const onCopy = vi.fn();
  const onDelete = vi.fn();
  const onDeleteAll = vi.fn();
  const onToggle = vi.fn();

  render(
    <table>
      <tbody>
        <PoleGroupRow
          locationKey='о:253'
          index={1}
          records={[makeDefect({ id: 1 }), makeDefect({ id: 2 })]}
          isExpanded={false}
          isFixed={false}
          onToggle={onToggle}
          onFix={onFix}
          onFixOne={vi.fn()}
          onCopy={onCopy}
          onDelete={onDelete}
          onDeleteAll={onDeleteAll}
          onEdit={onEdit}
          canEdit
          {...props}
        />
      </tbody>
    </table>,
  );

  return { onEdit, onFix, onCopy, onDelete, onDeleteAll, onToggle };
}

function openMenu() {
  fireEvent.click(screen.getByRole('button', { name: 'Действия' }));
}

describe('PoleGroupRow', () => {
  it('показывает «Исправить дефект» для каждого дефекта опоры', () => {
    const { onEdit } = renderRow({
      records: [
        makeDefect({ id: 1, defectName: 'Разрушен' }),
        makeDefect({ id: 2, defectName: 'Трещина' }),
      ],
    });

    openMenu();

    const items = within(screen.getByRole('menu')).getAllByRole('menuitem');
    const editItems = items.filter((item) => item.textContent?.startsWith('Исправить дефект'));
    expect(editItems).toHaveLength(2);
    expect(editItems[0]).toHaveTextContent('Исправить дефект: Разрушен');
    expect(editItems[1]).toHaveTextContent('Исправить дефект: Трещина');

    fireEvent.click(editItems[1]);
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 2 }));
  });

  it('для одного дефекта показывает короткую подпись', () => {
    renderRow({ records: [makeDefect({ id: 1 })] });

    openMenu();

    expect(
      screen.getByRole('menuitem', { name: 'Исправить дефект' }),
    ).toBeInTheDocument();
  });

  it('без права редактирования пункта «Исправить дефект» нет', () => {
    renderRow({ canEdit: false });

    openMenu();

    expect(
      screen.queryByRole('menuitem', { name: /Исправить дефект/ }),
    ).not.toBeInTheDocument();
  });

  it('устранённые дефекты нельзя исправить', () => {
    renderRow({ isFixed: true });

    openMenu();

    expect(
      screen.queryByRole('menuitem', { name: /Исправить дефект/ }),
    ).not.toBeInTheDocument();
  });
});
