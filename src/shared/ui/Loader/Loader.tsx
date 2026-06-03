import { memo } from 'react';
import { classNames } from '@/shared/lib/classNames/classNames';
import cls from './Loader.module.scss';

export interface LoaderProps {
  className?: string;
  /** Подпись для скринридеров. */
  label?: string;
}

/**
 * Точечный лоадер для полной загрузки страницы. Для инлайн-состояний предпочитайте Spinner.
 */
export const Loader = memo(({ className, label = 'Загрузка' }: LoaderProps) => (
  <div className={classNames(cls.loader, {}, [className])} role="status" aria-label={label}>
    <span />
    <span />
    <span />
    <span />
  </div>
));

Loader.displayName = 'Loader';
