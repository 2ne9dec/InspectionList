import { memo } from 'react';
import { classNames } from '@/shared/lib/classNames/classNames';
import cls from './Spinner.module.scss';

export type SpinnerSize = 's' | 'm' | 'l';

export interface SpinnerProps {
  size?: SpinnerSize;
  className?: string;
  /** Лейбл для скринридеров. */
  label?: string;
}

export const Spinner = memo(({ size = 'm', className, label = 'Загрузка' }: SpinnerProps) => (
  <span
    className={classNames(cls.Spinner, {}, [className, cls[`size_${size}`]])}
    role="status"
    aria-label={label}
  />
));

Spinner.displayName = 'Spinner';
