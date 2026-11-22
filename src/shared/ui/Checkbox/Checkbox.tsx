import { forwardRef, memo } from 'react';
import type { InputHTMLAttributes } from 'react';
import { classNames } from '@/shared/lib/classNames/classNames';
import cls from './Checkbox.module.scss';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  /** Дополнительный класс для самого input. */
  className?: string;
}

/** Единый чекбокс приложения. */
export const Checkbox = memo(forwardRef<HTMLInputElement, CheckboxProps>(
  function Checkbox({ className, ...rest }, ref) {
    return (
      <input
        ref={ref}
        type="checkbox"
        className={classNames(cls.checkbox, {}, [className])}
        {...rest}
      />
    );
  },
));

Checkbox.displayName = 'Checkbox';
