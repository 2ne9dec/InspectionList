import { memo, useId } from 'react';
import type { ReactNode } from 'react';
import { classNames } from '@/shared/lib/classNames/classNames';
import cls from './FormField.module.scss';

export interface FormFieldProps {
  /** Подпись поля. */
  label: ReactNode;
  /** Метка обязательного поля. */
  required?: boolean;
  /** Признак опциональности (необязательное поле). */
  optional?: boolean;
  /** Сообщение об ошибке (выводится красным). */
  error?: ReactNode;
  /** Подсказка под полем. */
  hint?: ReactNode;
  /** ID контрола — связывается с label. Если не задан — сгенерируется. */
  htmlFor?: string;
  className?: string;
  children: ReactNode;
}

/**
 * Универсальная обёртка для формового поля: label + control + hint/error.
 * Не зависит от типа контрола — оборачивает любой Input/Select/Textarea.
 */
export const FormField = memo((props: FormFieldProps) => {
  const { label, required, optional, error, hint, htmlFor, className, children } = props;
  const reactId = useId();
  const id = htmlFor ?? reactId;

  return (
    <div className={classNames(cls.FormField, { [cls.hasError]: !!error }, [className])}>
      <label htmlFor={id} className={cls.label}>
        <span>{label}</span>
        {required && <span className={cls.required} aria-hidden>*</span>}
        {optional && <span className={cls.optional}>(необяз.)</span>}
      </label>
      {children}
      {(error || hint) && (
        <span className={cls.message}>{error || hint}</span>
      )}
    </div>
  );
});

FormField.displayName = 'FormField';
