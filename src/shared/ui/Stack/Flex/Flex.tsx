import { memo } from 'react';
import type { HTMLAttributes, ReactNode } from 'react';
import { classNames } from '@/shared/lib/classNames/classNames';
import cls from './Flex.module.scss';

export type FlexJustify = 'start' | 'center' | 'end' | 'between' | 'around';
export type FlexAlign = 'start' | 'center' | 'end' | 'stretch' | 'baseline';
export type FlexDirection = 'row' | 'column';
export type FlexWrap = 'nowrap' | 'wrap';

/** Gap values map to --space-* scale: 1=4, 2=8, 3=12, ..., 9=48. */
export type FlexGap = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';

export interface FlexProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  justify?: FlexJustify;
  align?: FlexAlign;
  direction?: FlexDirection;
  gap?: FlexGap;
  wrap?: FlexWrap;
  /** Stretch to 100% width. */
  max?: boolean;
}

export const Flex = memo((props: FlexProps) => {
  const {
    className, children, justify = 'start', align = 'center',
    direction = 'row', gap, wrap, max, ...rest
  } = props;

  return (
    <div
      className={classNames(
        cls.Flex,
        { [cls.max]: !!max },
        [
          className,
          cls[`justify_${justify}`],
          cls[`align_${align}`],
          cls[`direction_${direction}`],
          gap ? cls[`gap_${gap}`] : undefined,
          wrap ? cls[`wrap_${wrap}`] : undefined,
        ],
      )}
      {...rest}
    >
      {children}
    </div>
  );
});

Flex.displayName = 'Flex';
