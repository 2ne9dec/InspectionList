import { memo } from 'react';
import type { Severity } from '@/shared/const/severity';
import { SEVERITY_LABELS } from '@/shared/const/severity';
import cls from './SeverityBadge.module.scss';

export interface SeverityBadgeProps {
  severity: Severity;
  /** Показывать ли цветную точку перед текстом. */
  withDot?: boolean;
  className?: string;
}

/**
 * Бейдж критичности.
 * Цвет задаётся через CSS-переменные из tokens/_severity.scss —
 * автоматически адаптируется к теме без JS-логики.
 */
export const SeverityBadge = memo(({ severity, withDot, className }: SeverityBadgeProps) => (
  <span
    className={`${cls.badge} ${cls[`sev_${severity}`]} ${className ?? ''}`}
    data-severity={severity}
  >
    {withDot && <span className={cls.dot} />}
    {SEVERITY_LABELS[severity]}
  </span>
));

SeverityBadge.displayName = 'SeverityBadge';
