/** Ключи для sessionStorage / localStorage. Централизованы, чтобы избежать дублирования. */
export const STORAGE_KEYS = {
  USER:      'defect_tracker_user',
  TOKEN:     'defect_tracker_token', // JWT access token
  INSPECTOR: 'defect_tracker_inspector', // последнее введённое ФИО
  THEME:     'theme',
} as const;

/** @deprecated Используйте STORAGE_KEYS.THEME */
export const LOCALSTORAGE_THEME_KEY = STORAGE_KEYS.THEME;
