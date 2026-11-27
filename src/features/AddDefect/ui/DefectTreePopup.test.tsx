import { fireEvent, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { vi } from 'vitest';
import type { DefectType, Element } from '@/entities/InspectionLine';
import { DefectTreePopup } from './DefectTreePopup';

const elements: Element[] = [{ id: 1, name: 'опора' }];
const defectTypes: DefectType[] = [
  { id: 10, name: 'скол', elementId: 1 },
  { id: 11, name: 'трещина', elementId: 1 },
];

beforeAll(() => {
  // В jsdom вынужденно рендерится мобильный вариант (нет hover),
  // поэтому matchMedia явно переводим в мобильный режим.
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

function renderPopup(props: Partial<ComponentProps<typeof DefectTreePopup>> = {}) {
  const onClose = vi.fn();
  const onSelect = vi.fn();
  const onSelectionChange = vi.fn();
  const result = render(
    <DefectTreePopup
      elements={elements}
      defectTypes={defectTypes}
      anchor={{ top: 10, left: 10 }}
      onSelect={onSelect}
      onClose={onClose}
      multiSelect
      selectedIds={new Set()}
      onSelectionChange={onSelectionChange}
      {...props}
    />,
  );
  return { ...result, onClose, onSelect, onSelectionChange };
}

function openDefectList() {
  // На мобильном сначала выбираем элемент, затем открывается список дефектов.
  fireEvent.click(screen.getByText('Опора'));
}

describe('DefectTreePopup', () => {
  it('в multiSelect выбирает дефект и закрывает поповер', () => {
    const { onClose, onSelectionChange } = renderPopup();
    openDefectList();

    fireEvent.click(screen.getByText('Скол'));

    expect(onSelectionChange).toHaveBeenCalledWith(new Set([10]));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('в одиночном режиме вызывает onSelect и закрывает поповер', () => {
    const { onClose, onSelect, onSelectionChange } = renderPopup({
      multiSelect: false,
      selectedIds: undefined,
      onSelectionChange: undefined,
    });
    openDefectList();

    fireEvent.click(screen.getByText('Трещина'));

    expect(onSelect).toHaveBeenCalledWith(defectTypes[1]);
    expect(onSelectionChange).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
