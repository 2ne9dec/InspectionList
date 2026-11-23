/**
 * Филиалы для выбора на странице входа. ID совпадают с таблицей FILIALS
 * и с номерами баз в server/.env (FB_DATABASE_1 … FB_DATABASE_4).
 */
export const LOGIN_FILIALS: ReadonlyArray<{ value: string; label: string }> = [
  { value: '1',   label: 'Гомельские ЭС' },
  { value: '2',   label: 'Жлобинские ЭС' },
  { value: '3',   label: 'Мозырские ЭС' },
  { value: '4',   label: 'Речицкие ЭС' },
  { value: 'rup', label: 'РУП «Гомельэнерго»' },
];

