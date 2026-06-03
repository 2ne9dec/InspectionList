import { memo } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import { classNames } from '@/shared/lib/classNames/classNames';
import cls from './Badge.module.scss';

export type BadgeVariant = 'neutral' | 'success' | 'danger' | 'warning' | 'info';
export type BadgeSize = 's' | 'm';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  /** Цвет фона можно задать напрямую — для динамической severity-карты. */
  color?: string;
  children?: ReactNode;
}

/**
 * Маленький бейдж для статусов, счётчиков, severity-уровней.
 */
export const Badge = memo((props: BadgeProps) => {
  const { variant = 'neutral', size = 'm', color, className, style, children, ...rest } = props;

  const inlineStyle = color ? { ...style, background: color, color: 'var(--color-text-on-accent)' } : style;

  return (
    <span
      className={classNames(cls.Badge, {}, [className, cls[variant], cls[`size_${size}`]])}
      style={inlineStyle}
      {...rest}
    >
      {children}
    </span>
  );
});

Badge.displayName = 'Badge';
