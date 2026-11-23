import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DefectTableHeader } from './DefectTableHeader';

const props = {
  sortDir: 'asc' as const,
  onSortToggle: vi.fn(),
  filterElementId: '',
  filterDefectTypeId: '',
  elements: [{ id: 1, name: 'Изолятор' }],
  defectTypes: [{ id: 1, name: 'Разрушен' }],
  onElementChange: vi.fn(),
  onDefectTypeChange: vi.fn(),
};

describe('DefectTableHeader', () => {
  it('всегда показывает колонки детализации, чтобы раскрытие не сдвигало таблицу', () => {
    render(
      <table>
        <DefectTableHeader {...props} isFixed={false} />
      </table>,
    );

    expect(screen.getByText('Дата обн.')).toBeInTheDocument();
    expect(screen.getByText('Обнаружил')).toBeInTheDocument();
    expect(screen.getByText('Примечание')).toBeInTheDocument();
    expect(screen.queryByText('Дата устр.')).not.toBeInTheDocument();
  });

  it('добавляет колонки устранения на вкладке «Устранённые»', () => {
    render(
      <table>
        <DefectTableHeader {...props} isFixed />
      </table>,
    );

    expect(screen.getByText('Дата устр.')).toBeInTheDocument();
    expect(screen.getByText('Устранил')).toBeInTheDocument();
  });
});
