import { memo } from 'react';
import { classNames } from '@/shared/lib/classNames/classNames';
import cls from './Overlay.module.scss';

export interface OverlayProps {
  className?: string;
  onClick?: () => void;
}

export const Overlay = memo(({ className, onClick }: OverlayProps) => (
  <div
    onClick={onClick}
    role={onClick ? 'button' : undefined}
    aria-label={onClick ? 'Закрыть' : undefined}
    className={classNames(cls.Overlay, {}, [className])}
  />
));

Overlay.displayName = 'Overlay';
