import { memo } from 'react';

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
  color = '#22c55e',
  label,
}: ProgressRingProps) => {
  const r      = (size - strokeWidth) / 2;
  const circ   = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(pct, 100) / 100);

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        {/* Трек */}
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke="var(--color-border, rgba(148,163,184,.2))"
          strokeWidth={strokeWidth}
        />
        {/* Дуга прогресса */}
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      {/* Текст в центре */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        fontSize: size < 52 ? '0.58rem' : '0.65rem',
        fontWeight: 600,
        color: 'var(--color-text-primary, #f1f5f9)',
        lineHeight: 1.1,
        textAlign: 'center',
      }}>
        <span>{pct}%</span>
        {label && <span style={{ fontSize: '0.5rem', color: 'var(--color-text-secondary, #94a3b8)', fontWeight: 400 }}>{label}</span>}
      </div>
    </div>
  );
});

ProgressRing.displayName = 'ProgressRing';
