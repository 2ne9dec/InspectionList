import { Component, Suspense } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { PageError } from '@/widgets/PageError';
import { logger } from '@/shared/lib/logger';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Кастомный fallback. По-умолчанию — PageError. */
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Перехватывает необработанные ошибки рендера. В dev — логирует в консоль.
 * В продакшене — точка интеграции с Sentry/внешним логгером.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false };

  public static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // logger пишет в консоль и транслирует событие подписчикам
    // (точка интеграции с Sentry/внешним логгером — logger.subscribe).
    logger.error('[ErrorBoundary]', error, errorInfo);
  }

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <Suspense fallback="">
          {this.props.fallback ?? <PageError />}
        </Suspense>
      );
    }
    return this.props.children;
  }
}
