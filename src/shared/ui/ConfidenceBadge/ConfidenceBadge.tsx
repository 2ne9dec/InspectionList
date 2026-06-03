import { memo } from 'react';
import cls from './ConfidenceBadge.module.scss';

interface ConfidenceBadgeProps {
  /** 0..1 */
  value: number;
  className?: string;
}

/**
 * Бейдж уверенности AI-модели (0–100%).
 * Цвет берётся из CSS-переменных severity-токенов:
 *   ≥80% → ok (зелёный), ≥50% → medium (жёлтый), <50% → critical (красный)
 */
export const ConfidenceBadge = memo(({ value, className }: ConfidenceBadgeProps) => {
  const pct   = Math.round(value * 100);
  const token = pct >= 80 ? 'ok' : pct >= 50 ? 'medium' : 'critical';

  return (
    <span
      className={`${cls.badge} ${className ?? ''}`}
      style={{
        color:       `var(--severity-${token})`,
        borderColor: `var(--severity-${token}-border)`,
        background:  `var(--severity-${token}-bg)`,
      }}
    >
      {pct}%
    </span>
  );
});

ConfidenceBadge.displayName = 'ConfidenceBadge';
