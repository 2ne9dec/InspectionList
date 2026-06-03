import { forwardRef, memo, useCallback, useEffect, useId, useImperativeHandle, useRef } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { classNames } from '@/shared/lib/classNames/classNames';
import cls from './Input.module.scss';

type HTMLInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'readOnly' | 'onKeyDown' | 'size'
>;

export type InputSize = 's' | 'm' | 'l';

export interface InputProps extends HTMLInputProps {
  value?: string | number;
  onChange?: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  /** Подпись над инпутом. */
  label?: ReactNode;
  /** Подсказка под инпутом (или сообщение об ошибке если invalid). */
  hint?: ReactNode;
  /** Состояние ошибки — красная рамка + красный hint. */
  invalid?: boolean;
  /** readonly. */
  readonly?: boolean;
  /** Сфокусировать при монтировании. */
  autofocus?: boolean;
  /** Размер. По-умолчанию 'm'. */
  size?: InputSize;
  /** Иконка слева. */
  leftIcon?: ReactNode;
  /** Иконка/контент справа. */
  rightSlot?: ReactNode;
}

export const Input = memo(
  forwardRef<HTMLInputElement, InputProps>(function Input(props, ref) {
    const {
      className,
      value,
      onChange,
      onKeyDown,
      type = 'text',
      placeholder,
      autofocus,
      readonly,
      label,
      hint,
      invalid,
      id,
      name,
      autoComplete,
      size = 'm',
      leftIcon,
      rightSlot,
      ...rest
    } = props;

    const reactId  = useId();
    const inputId  = id ?? reactId;
    const hintId   = hint ? `${inputId}-hint` : undefined;

    const innerRef = useRef<HTMLInputElement>(null);
    useImperativeHandle(ref, () => innerRef.current as HTMLInputElement, []);

    useEffect(() => {
      if (autofocus) innerRef.current?.focus();
    }, [autofocus]);

    /** Клик по обёртке .field открывает нативный date-picker на всей строке. */
    const handleFieldClick = useCallback(() => {
      if (type === 'date' && !readonly) {
        const inp = innerRef.current as (HTMLInputElement & { showPicker?(): void }) | null;
        try { inp?.showPicker?.(); } catch { inp?.focus(); }
      }
    }, [type, readonly]);

    return (
      <div
        className={classNames(
          cls.wrapper,
          {
            [cls.readonly]: readonly,
            [cls.invalid]:  invalid,
          },
          [className, cls[`size_${size}`]],
        )}
      >
        {label && (
          <label htmlFor={inputId} className={cls.label}>{label}</label>
        )}
        <div className={cls.field} onClick={handleFieldClick}>
          {leftIcon && <span className={cls.leftIcon}>{leftIcon}</span>}
          <input
            ref={innerRef}
            id={inputId}
            name={name}
            type={type}
            value={value ?? ''}
            autoComplete={autoComplete}
            aria-invalid={invalid || undefined}
            aria-describedby={hintId}
            className={cls.input}
            onChange={(e) => onChange?.(e.target.value)}
            onKeyDown={onKeyDown}
            readOnly={readonly}
            placeholder={placeholder}
            {...rest}
          />
          {rightSlot && <span className={cls.rightSlot}>{rightSlot}</span>}
        </div>
        {hint && (
          <span id={hintId} className={cls.hint}>{hint}</span>
        )}
      </div>
    );
  }),
);

Input.displayName = 'Input';
