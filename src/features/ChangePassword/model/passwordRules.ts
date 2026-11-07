/**
 * Требования к паролю, который пользователь задаёт себе сам.
 * Совпадают с проверкой на сервере (server/routes/auth.js → validateNewPassword).
 */
export const PASSWORD_RULES_HINT = 'Не менее 8 символов, буквы и цифры';

export function validateNewPassword(newPass: string, oldPass?: string): string | null {
  if (newPass.length < 8) return 'Пароль должен быть не менее 8 символов';
  if (!/[A-Za-zА-Яа-яЁё]/.test(newPass) || !/\d/.test(newPass)) return 'Пароль должен содержать буквы и цифры';
  if (oldPass && newPass === oldPass) return 'Новый пароль должен отличаться от текущего';
  return null;
}
