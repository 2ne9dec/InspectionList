import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { CreateSheetModal } from './CreateSheetModal';

vi.mock('../model/useCreateSheetForm', () => ({
  useCreateSheetForm: () => ({
    isOpen: true,
    voltageId: 1,
    lineId: 2,
    createdBy: 'Иванов И.И.',
    createdDate: '2026-01-01',
    effectiveFilialId: 1,
    userFilialName: 'Гомель',
    voltagesFetching: false,
    voltagesCount: 1,
    voltageOptions: [{ value: '1', label: 'ВЛ 110 кВ' }],
    lineOptions: [{ value: '2', label: 'Линия 1' }],
    selectedLine: null,
    isValid: true,
    handleSubmit: vi.fn(),
    closeModal: vi.fn(),
    setVoltageId: vi.fn(),
    setLineId: vi.fn(),
    setCreatedBy: vi.fn(),
    setCreatedDate: vi.fn(),
  }),
}));

describe('CreateSheetModal', () => {
  it('связывает подписи напряжения и линии с их триггерами', () => {
    render(<CreateSheetModal />);

    expect(screen.getByLabelText(/Напряжение/)).toHaveAttribute('id', 'cs-voltage');
    expect(screen.getByLabelText(/Линия/)).toHaveAttribute('id', 'cs-line');
    expect(screen.getByLabelText(/Дата осмотра/)).toHaveAttribute('id', 'cs-date');
    expect(screen.getByLabelText(/Осматривал/)).toHaveAttribute('id', 'cs-inspector');
  });
});
