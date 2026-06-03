import { memo } from 'react';
import type { ReactNode } from 'react';
import { classNames } from '@/shared/lib/classNames/classNames';
import cls from './Text.module.scss';

export type TextVariant = 'primary' | 'secondary' | 'muted' | 'inverse' | 'error' | 'accent';
export type TextAlign = 'left' | 'center' | 'right';
export type TextSize = 'xs' | 's' | 'm' | 'l' | 'xl' | '2xl';
export type TextWeight = 'regular' | 'medium' | 'semibold' | 'bold';

export interface TextProps {
  className?: string;
  title?: ReactNode;
  text?: ReactNode;
  variant?: TextVariant;
  align?: TextAlign;
  size?: TextSize;
  weight?: TextWeight;
  'data-testid'?: string;
}

const sizeToHeader: Record<TextSize, 'h1' | 'h2' | 'h3' | 'h4'> = {
  '2xl': 'h1',
  xl: 'h1',
  l:  'h2',
  m:  'h3',
  s:  'h4',
  xs: 'h4',
};

export const Text = memo((props: TextProps) => {
  const {
    className,
    title,
    text,
    variant = 'primary',
    align = 'left',
    size = 'm',
    weight,
    'data-testid': dataTestId = 'Text',
  } = props;

  const HeaderTag = sizeToHeader[size];

  const classes = classNames(
    cls.Text,
    {},
    [
      className,
      cls[variant],
      cls[`align_${align}`],
      cls[`size_${size}`],
      weight ? cls[`weight_${weight}`] : undefined,
    ],
  );

  return (
    <div className={classes}>
      {title && (
        <HeaderTag className={cls.title} data-testid={`${dataTestId}.Header`}>
          {title}
        </HeaderTag>
      )}
      {text && (
        <p className={cls.text} data-testid={`${dataTestId}.Paragraph`}>
          {text}
        </p>
      )}
    </div>
  );
});

Text.displayName = 'Text';
