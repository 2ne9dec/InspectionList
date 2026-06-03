/**
 * Реэкспорт типов Redux-стора для соблюдения FSD.
 * entities и features импортируют отсюда, а не напрямую из @/app.
 */
export type {
  StateSchema,
  StateSchemaKey,
  ThunkConfig,
  ReduxStoreWithManager,
} from '@/app/providers/StoreProvider';
export type { AppDispatch } from '@/app/providers/StoreProvider';
