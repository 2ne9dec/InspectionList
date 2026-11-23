import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { makeSheetFull } from '@tests/factories';
import { SheetCard } from './SheetCard';

describe('SheetCard', () => {
  it('передаёт выбор листка в onSelect', () => {
    const onSelect = vi.fn();

    render(
      <table>
        <tbody>
          <SheetCard
            sheet={makeSheetFull({ id: 7 })}
            index={1}
            onOpen={vi.fn()}
            showFilial={false}
            onSelect={onSelect}
          />
        </tbody>
      </table>,
    );

    fireEvent.click(screen.getByRole('checkbox'));

    expect(onSelect).toHaveBeenCalledWith(7, true);
  });

  it('открывает листок по клику на строку', () => {
    const onOpen = vi.fn();

    render(
      <table>
        <tbody>
          <SheetCard
            sheet={makeSheetFull({ id: 8 })}
            index={1}
            onOpen={onOpen}
            showFilial={false}
          />
        </tbody>
      </table>,
    );

    fireEvent.click(screen.getByText('ВЛ 110 кВ'));

    expect(onOpen).toHaveBeenCalledWith(8);
  });
});
