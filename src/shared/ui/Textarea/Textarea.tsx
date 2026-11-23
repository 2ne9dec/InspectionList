import { forwardRef, memo } from 'react';
import type { TextareaHTMLAttributes } from 'react';
import { classNames } from '@/shared/lib/classNames/classNames';
import cls from './Textarea.module.scss';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Красная рамка + aria-invalid. */
  invalid?: boolean;
}

/** Единая многострочная форма. */
export const Textarea = memo(forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ className, invalid, ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        className={classNames(cls.textarea, { [cls.invalid]: !!invalid }, [className])}
        aria-invalid={invalid || undefined}
        {...rest}
      />
    );
  },
));

Textarea.displayName = 'Textarea';
