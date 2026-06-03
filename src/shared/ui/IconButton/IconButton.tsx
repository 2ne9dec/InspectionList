import { forwardRef, memo } from 'react';
import type { ReactNode } from 'react';
import { Button } from '../Button';
import type { ButtonProps } from '../Button';

export interface IconButtonProps extends Omit<ButtonProps, 'children' | 'leftIcon' | 'rightIcon' | 'square'> {
  /** Иконка/символ. */
  icon: ReactNode;
  /** Обязательный aria-label для доступности (иконка без текста). */
  'aria-label': string;
}

/**
 * Квадратная кнопка-иконка. Тонкая обёртка над Button с обязательным aria-label.
 */
export const IconButton = memo(
  forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(props, ref) {
    const { icon, ...rest } = props;
    return (
      <Button ref={ref} square {...rest}>
        {icon}
      </Button>
    );
  }),
);

IconButton.displayName = 'IconButton';
