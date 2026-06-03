import { forwardRef, memo, useId } from 'react';
import type { SelectHTMLAttributes, ReactNode } from 'react';
import { classNames } from '@/shared/lib/classNames/classNames';
import cls from './Select.module.scss';

export interface SelectOption<V extends string | number = string | number> {
  value: V;
  label: string;
  disabled?: boolean;
}

export type SelectSize = 's' | 'm' | 'l';

type HTMLSelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'size'>;

export interface SelectProps<V extends string | number = string | number> extends HTMLSelectProps {
  options: ReadonlyArray<SelectOption<V>>;
  value?: V | '';
  onChange?: (value: V | '') => void;
  /** Плейсхолдер (пустое значение). */
  placeholder?: string;
  label?: ReactNode;
  size?: SelectSize;
  invalid?: boolean;
}

function SelectInner<V extends string | number = string | number>(
  props: SelectProps<V>,
  ref: React.Ref<HTMLSelectElement>,
) {
  const {
    options, value, onChange, placeholder, label, size = 'm', invalid,
    id, name, className, ...rest
  } = props;

  const reactId = useId();
  const selectId = id ?? reactId;

  return (
    <div className={classNames(cls.wrapper, { [cls.invalid]: !!invalid }, [className, cls[`size_${size}`]])}>
      {label && <label htmlFor={selectId} className={cls.label}>{label}</label>}
      <div className={cls.field}>
        <select
          ref={ref}
          id={selectId}
          name={name}
          value={value ?? ''}
          aria-invalid={invalid || undefined}
          onChange={(e) => {
            const v = e.target.value;
            onChange?.(v === '' ? '' : (Number.isNaN(Number(v)) ? (v as unknown as V) : (Number(v) as unknown as V)));
          }}
          className={cls.select}
          {...rest}
        >
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={String(opt.value)} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>
        <span className={cls.arrow} aria-hidden>▼</span>
      </div>
    </div>
  );
}

export const Select = memo(forwardRef(SelectInner)) as <V extends string | number = string | number>(
  props: SelectProps<V> & { ref?: React.Ref<HTMLSelectElement> },
) => JSX.Element;
