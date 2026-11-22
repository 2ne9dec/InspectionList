import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Badge } from './Badge';

describe('Badge', () => {
  it('рендерит текст', () => {
    render(<Badge>Устранён</Badge>);

    expect(screen.getByText('Устранён')).toBeInTheDocument();
  });

  it('прокидывает aria-атрибуты и title', () => {
    render(
      <Badge role='status' title='Статус листа' aria-label='Статус'>
        Активен
      </Badge>,
    );

    const badge = screen.getByRole('status', { name: 'Статус' });
    expect(badge).toHaveAttribute('title', 'Статус листа');
    expect(badge).toHaveTextContent('Активен');
  });

  it('добавляет пользовательский className', () => {
    render(<Badge className='custom-badge'>Метка</Badge>);

    expect(screen.getByText('Метка')).toHaveClass('custom-badge');
  });

  it('применяет переданный цвет через inline-стиль', () => {
    render(<Badge color='#ff0000'>Срочно</Badge>);

    const badge = screen.getByText('Срочно');
    expect(badge.getAttribute('style')).toContain('background');
  });

  it('сохраняет пользовательский style без color', () => {
    render(<Badge style={{ opacity: 0.5 }}>Метка</Badge>);

    expect(screen.getByText('Метка')).toHaveStyle({ opacity: '0.5' });
  });
});
