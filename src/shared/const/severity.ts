export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'ok';

export const SEVERITY_LABELS: Record<Severity, string> = {
  critical: 'Критичный',
  high:     'Высокий',
  medium:   'Средний',
  low:      'Низкий',
  ok:       'Норма',
};

/**
 * Цвета severity — CSS-переменные из tokens/_severity.scss.
 * Не захардкоживайте HEX в компонентах — используйте этот словарь.
 */
export const SEVERITY_COLORS: Record<Severity, string> = {
  critical: 'var(--severity-critical)',
  high:     'var(--severity-high)',
  medium:   'var(--severity-medium)',
  low:      'var(--severity-low)',
  ok:       'var(--severity-ok)',
};

export const SEVERITY_BG: Record<Severity, string> = {
  critical: 'var(--severity-critical-bg)',
  high:     'var(--severity-high-bg)',
  medium:   'var(--severity-medium-bg)',
  low:      'var(--severity-low-bg)',
  ok:       'var(--severity-ok-bg)',
};

export const SEVERITY_BORDER: Record<Severity, string> = {
  critical: 'var(--severity-critical-border)',
  high:     'var(--severity-high-border)',
  medium:   'var(--severity-medium-border)',
  low:      'var(--severity-low-border)',
  ok:       'var(--severity-ok-border)',
};

/** Порядок сортировки по критичности (меньше = опаснее). */
export const SEVERITY_RANK: Record<Severity, number> = {
  critical: 0,
  high:     1,
  medium:   2,
  low:      3,
  ok:       4,
};
