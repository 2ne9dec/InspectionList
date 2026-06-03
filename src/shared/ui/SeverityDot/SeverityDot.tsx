import { memo } from 'react';
import type { Severity } from '@/shared/const/severity';
import cls from './SeverityDot.module.scss';

export interface SeverityDotProps {
  severity: Severity;
  size?: 's' | 'm' | 'l';
  className?: string;
}

/** Маленькая цветная точка-индикатор критичности. Цвет — CSS-переменная. */
export const SeverityDot = memo(({ severity, size = 'm', className }: SeverityDotProps) => (
  <span
    className={[cls.dot, cls[size], cls[`sev_${severity}`], className].filter(Boolean).join(' ')}
    aria-hidden
  />
));

SeverityDot.displayName = 'SeverityDot';
