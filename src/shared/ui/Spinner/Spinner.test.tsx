import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Spinner } from './Spinner';

describe('Spinner', () => {
  it('объявляет себя статусом с подписью по умолчанию', () => {
    render(<Spinner />);

    expect(screen.getByRole('status', { name: 'Загрузка' })).toBeInTheDocument();
  });

  it('использует переданную подпись', () => {
    render(<Spinner label='Сохранение' />);

    expect(screen.getByRole('status', { name: 'Сохранение' })).toBeInTheDocument();
  });

  it('добавляет пользовательский className для всех размеров', () => {
    render(<Spinner size='l' className='custom-spinner' />);

    expect(screen.getByRole('status')).toHaveClass('custom-spinner');
  });
});
