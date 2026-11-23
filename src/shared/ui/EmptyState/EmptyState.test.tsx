import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('показывает заголовок, описание, иконку и действие', () => {
    render(
      <EmptyState
        title='Ничего не найдено'
        description='Измените фильтры или создайте запись'
        icon={<span data-testid='empty-icon' />}
        action={<button type='button'>Создать лист</button>}
      />,
    );

    expect(screen.getByText('Ничего не найдено')).toBeInTheDocument();
    expect(
      screen.getByText('Измените фильтры или создайте запись'),
    ).toBeInTheDocument();
    expect(screen.getByTestId('empty-icon')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Создать лист' }),
    ).toBeInTheDocument();
  });

  it('не рендерит отсутствующие части', () => {
    render(<EmptyState title='Пусто' />);

    expect(screen.getByText('Пусто')).toBeInTheDocument();
    expect(screen.queryByTestId('empty-icon')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('добавляет пользовательский className', () => {
    render(<EmptyState title='Пусто' className='custom-empty' />);

    expect(screen.getByText('Пусто').parentElement).toHaveClass('custom-empty');
  });

  it('рендерит описание без заголовка', () => {
    render(<EmptyState description='Данных пока нет' />);

    expect(screen.getByText('Данных пока нет')).toBeInTheDocument();
  });
});
