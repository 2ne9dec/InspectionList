import { forwardRef, memo } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import { classNames } from '@/shared/lib/classNames/classNames';
import cls from './Card.module.scss';

export type CardVariant = 'surface' | 'outlined' | 'ghost';
export type CardPadding = 'none' | 's' | 'm' | 'l';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: CardPadding;
  /** Stretch to 100% width. */
  max?: boolean;
  /** Interactive hover effect. */
  interactive?: boolean;
  children: ReactNode;
}

export const Card = memo(
  forwardRef<HTMLDivElement, CardProps>(function Card(props, ref) {
    const {
      className,
      children,
      variant = 'surface',
      padding = 'm',
      max,
      interactive,
      ...rest
    } = props;

    return (
      <div
        ref={ref}
        className={classNames(
          cls.Card,
          { [cls.max]: !!max, [cls.interactive]: !!interactive },
          [className, cls[variant], cls[`padding_${padding}`]],
        )}
        {...rest}
      >
        {children}
      </div>
    );
  }),
);

Card.displayName = 'Card';
