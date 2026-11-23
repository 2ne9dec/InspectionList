import { memo } from 'react';
import cls from './ProgressRing.module.scss';

interface ProgressRingProps {
  /** Процент 0–100 */
  pct: number;
  size?: number;
  strokeWidth?: number;
  /** CSS-цвет дуги */
  color?: string;
  label?: string;
}

/**
 * Тонкое SVG-кольцо прогресса.
 * Используется в шапке SheetDetailPage для показа % устранённых дефектов.
 */
export const ProgressRing = memo(({
  pct,
  size = 48,
  strokeWidth = 4,
  color = 'var(--color-success)',
  label,
}: ProgressRingProps) => {
  const r      = (size - strokeWidth) / 2;
  const circ   = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(pct, 100) / 100);

  const vars = {
    '--ring-size': `${size}px`,
    '--ring-stroke': strokeWidth,
    '--ring-color': color,
    '--ring-circumference': circ,
    '--ring-offset': offset,
  } as React.CSSProperties;

  return (
    <div className={cls.root} style={vars}>
      <svg className={cls.svg} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" focusable="false">
        <circle
          className={cls.track}
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={strokeWidth}
        />
        <circle
          className={cls.arc}
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={strokeWidth}
        />
      </svg>
      <div className={`${cls.text} ${size < 52 ? cls.small : cls.medium}`}>
        <span>{pct}%</span>
        {label && <span className={cls.label}>{label}</span>}
      </div>
    </div>
  );
});

ProgressRing.displayName = 'ProgressRing';
