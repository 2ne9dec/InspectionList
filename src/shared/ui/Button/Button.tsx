import { forwardRef, memo } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { classNames } from '@/shared/lib/classNames/classNames';
import cls from './Button.module.scss';

/**
 * Визуальные варианты:
 *  - primary       — акцентный фон, основное действие
 *  - secondary     — outline, вторичное действие
 *  - ghost         — прозрачный, для иконок и неагрессивных кнопок
 *  - danger        — outline + красный, для деструктивных действий
 *  - danger-filled — заливка красным, для подтверждения опасных действий
 */
export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'danger'
  | 'danger-filled';

export type ButtonSize = 's' | 'm' | 'l' | 'xl';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  square?: boolean;
  fullWidth?: boolean;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  type?: 'button' | 'submit' | 'reset';
  children?: ReactNode;
}

export const Button = memo(
  forwardRef<HTMLButtonElement, ButtonProps>(function Button(props, ref) {
    const {
      className,
      children,
      variant = 'secondary',
      size = 'm',
      square,
      fullWidth,
      disabled,
      loading,
      leftIcon,
      rightIcon,
      type = 'button',
      ...rest
    } = props;

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={classNames(
          cls.Button,
          {
            [cls.square]: square,
            [cls.fullWidth]: fullWidth,
            [cls.loading]: loading,
          },
          [className, cls[variant], cls[`size_${size}`]],
        )}
        {...rest}
      >
        {loading && <span className={cls.spinner} aria-hidden />}
        {!loading && leftIcon && <span className={cls.icon}>{leftIcon}</span>}
        {children && <span className={cls.label}>{children}</span>}
        {!loading && rightIcon && <span className={cls.icon}>{rightIcon}</span>}
      </button>
    );
  }),
);

Button.displayName = 'Button';
