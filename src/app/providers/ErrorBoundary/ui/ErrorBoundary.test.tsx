import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';

function Bomb(): JSX.Element {
  throw new Error('boom');
}

describe('ErrorBoundary', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('показывает fallback при ошибке дочернего компонента', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary fallback={<div>Что-то пошло не так</div>}>
        <Bomb />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Что-то пошло не так')).toBeInTheDocument();
  });

  it('рендерит дочерний компонент без ошибки', () => {
    render(
      <ErrorBoundary fallback={<div>fallback</div>}>
        <span>Контент</span>
      </ErrorBoundary>,
    );

    expect(screen.getByText('Контент')).toBeInTheDocument();
    expect(screen.queryByText('fallback')).not.toBeInTheDocument();
  });
});
