import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PoleElementChips } from './PoleElementChips';

describe('PoleElementChips', () => {
  it('показывает до трёх элементов', () => {
    render(<PoleElementChips elements={['Изолятор', 'Траверса', 'Провод']} />);

    expect(screen.getByText('Изолятор')).toBeInTheDocument();
    expect(screen.getByText('Траверса')).toBeInTheDocument();
    expect(screen.getByText('Провод')).toBeInTheDocument();
    expect(screen.queryByText(/ещё/)).not.toBeInTheDocument();
  });

  it('сворачивает лишние элементы в счётчик', () => {
    render(<PoleElementChips elements={['Изолятор', 'Траверса', 'Провод', 'Гирлянда']} />);

    expect(screen.getByText('+1 ещё')).toBeInTheDocument();
  });
});
