import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Loader } from './Loader';

describe('Loader', () => {
  it('объявляет себя статусом с подписью по умолчанию', () => {
    render(<Loader />);

    expect(screen.getByRole('status', { name: 'Загрузка' })).toBeInTheDocument();
  });

  it('использует переданную подпись для скринридеров', () => {
    render(<Loader label='Загружаем листы' />);

    expect(
      screen.getByRole('status', { name: 'Загружаем листы' }),
    ).toBeInTheDocument();
  });

  it('добавляет пользовательский className', () => {
    render(<Loader className='custom-loader' />);

    expect(screen.getByRole('status')).toHaveClass('custom-loader');
  });
});
