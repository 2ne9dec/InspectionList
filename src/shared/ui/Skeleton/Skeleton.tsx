import { memo } from 'react';
import type { CSSProperties } from 'react';
import { classNames } from '@/shared/lib/classNames/classNames';
import cls from './Skeleton.module.scss';

export interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  /** Прямоугольник / круг / линия. */
  variant?: 'rect' | 'circle' | 'text';
  className?: string;
}

/**
 * Placeholder для контента в состоянии загрузки.
 * Использовать вместо «Загрузка...» — даёт стабильный layout.
 */
export const Skeleton = memo((props: SkeletonProps) => {
  const { width, height, variant = 'rect', className } = props;
  const style: CSSProperties = { width, height };

  return (
    <span className={classNames(cls.Skeleton, {}, [className, cls[variant]])} style={style} aria-hidden />
  );
});

Skeleton.displayName = 'Skeleton';
