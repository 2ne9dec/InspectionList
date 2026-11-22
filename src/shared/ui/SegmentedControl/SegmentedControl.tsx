import { classNames } from '@/shared/lib/classNames/classNames';
import cls from './SegmentedControl.module.scss';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  options: ReadonlyArray<SegmentedOption<T>>;
  value: T;
  onChange: (value: T) => void;
  className?: string;
  'aria-label'?: string;
}

/** Компактный переключатель из 2–4 сегментов. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
  'aria-label': ariaLabel,
}: SegmentedControlProps<T>) {
  return (
    <div className={classNames(cls.control, {}, [className])} role='group' aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          key={option.value}
          type='button'
          className={classNames(cls.segment, { [cls.active]: option.value === value })}
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
