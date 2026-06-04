/** Ключи для sessionStorage / localStorage. Централизованы, чтобы избежать дублирования. */
export const STORAGE_KEYS = {
  USER:      'defect_tracker_user',
  INSPECTOR: 'defect_tracker_inspector', // последнее введённое ФИО
} as const;
