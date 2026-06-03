/**
 * Конфигурация AI-пайплайна (single-pass архитектура).
 *
 * Single-pass YOLO: один детектор, классы вида "insulator_warning", "wire_critical".
 * Stage-2 классификатор не используется.
 *
 * Синхронизировать с:
 *   - ai-service/config/class_map.py
 *   - json-server/seed/elements.json
 *   - json-server/seed/defectTypes.json
 */

// ── URL AI-сервиса ────────────────────────────────────────────────────────────
export const AI_SERVICE_URL =
  import.meta.env.VITE_AI_SERVICE_URL ?? 'http://localhost:8765';

// ── Пороги уверенности ────────────────────────────────────────────────────────
export const AI_DEFAULTS = {
  /** Минимальная уверенность детектора (0..1). */
  detectionConfidence: 0.25,
  /** Максимум фото в одном batch-запросе. */
  maxBatchSize: 20,
} as const;

// ── Single-pass классы (синхронизировать с ai-service/config/class_map.py) ───
export const YOLO_CLASSES: readonly string[] = [
  'insulator_ok', 'insulator_warning', 'insulator_critical',
  'wire_ok',      'wire_warning',      'wire_critical',
  'pole_ok',      'pole_warning',      'pole_critical',
  'cross_arm_ok', 'cross_arm_warning', 'cross_arm_critical',
  'vegetation_ok','vegetation_warning','vegetation_critical',
  'corrosion_warning', 'corrosion_critical',
] as const;

// ── Маппинг класса YOLO → сущности БД ────────────────────────────────────────
export interface ClassMapEntry {
  elementId:    number | null;
  defectTypeId: number | null;
  severity:     'low' | 'medium' | 'high' | 'critical' | null;
}

export const CLASS_MAP: Readonly<Record<string, ClassMapEntry>> = {
  // Изолятор
  insulator_ok:       { elementId: 1, defectTypeId: null, severity: null },
  insulator_warning:  { elementId: 1, defectTypeId: 1,    severity: 'medium' },
  insulator_critical: { elementId: 1, defectTypeId: 1,    severity: 'critical' },
  // Провод
  wire_ok:            { elementId: 2, defectTypeId: null, severity: null },
  wire_warning:       { elementId: 2, defectTypeId: 2,    severity: 'medium' },
  wire_critical:      { elementId: 2, defectTypeId: 2,    severity: 'critical' },
  // Опора
  pole_ok:            { elementId: 3, defectTypeId: null, severity: null },
  pole_warning:       { elementId: 3, defectTypeId: 3,    severity: 'low' },
  pole_critical:      { elementId: 3, defectTypeId: 3,    severity: 'critical' },
  // Траверса
  cross_arm_ok:       { elementId: 5, defectTypeId: null, severity: null },
  cross_arm_warning:  { elementId: 5, defectTypeId: 6,    severity: 'medium' },
  cross_arm_critical: { elementId: 5, defectTypeId: 6,    severity: 'critical' },
  // Растительность
  vegetation_ok:      { elementId: 4, defectTypeId: null, severity: null },
  vegetation_warning: { elementId: 4, defectTypeId: 5,    severity: 'medium' },
  vegetation_critical:{ elementId: 4, defectTypeId: 5,    severity: 'high' },
  // Коррозия
  corrosion_warning:  { elementId: 1, defectTypeId: 4,    severity: 'medium' },
  corrosion_critical: { elementId: 1, defectTypeId: 4,    severity: 'critical' },
} as const;

/** Разбирает "insulator_warning" → { element: "insulator", condition: "warning" } */
export function parseYoloClass(className: string): { element: string; condition: string } {
  const knownConditions = new Set(['ok', 'warning', 'critical', 'high', 'low']);
  const lastUnderscore = className.lastIndexOf('_');
  if (lastUnderscore > 0) {
    const condition = className.slice(lastUnderscore + 1);
    if (knownConditions.has(condition)) {
      return { element: className.slice(0, lastUnderscore), condition };
    }
  }
  return { element: className, condition: 'unknown' };
}

/** Возвращает маппинг для класса или пустую запись */
export function resolveClassMap(className: string): ClassMapEntry {
  return CLASS_MAP[className] ?? { elementId: null, defectTypeId: null, severity: null };
}
