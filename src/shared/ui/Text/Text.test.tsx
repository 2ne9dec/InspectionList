import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Text } from './Text';

describe('Text', () => {
  it('рендерит заголовок и текст', () => {
    render(<Text title='Заголовок' text='Описание' />);

    expect(screen.getByTestId('Text.Header')).toHaveTextContent('Заголовок');
    expect(screen.getByTestId('Text.Paragraph')).toHaveTextContent('Описание');
  });

  it('подбирает уровень заголовка по размеру', () => {
    render(<Text title='Большой' size='xl' />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Большой');
  });

  it('не рендерит пустые блоки', () => {
    render(<Text />);
    expect(screen.queryByTestId('Text.Header')).not.toBeInTheDocument();
    expect(screen.queryByTestId('Text.Paragraph')).not.toBeInTheDocument();
  });
});
