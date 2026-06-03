import { useSelector, type TypedUseSelectorHook } from 'react-redux';
import type { StateSchema } from '@/app/providers/StoreProvider';

/**
 * Типизированная версия useSelector.
 * Использовать вместо useSelector из react-redux чтобы получать
 * автодополнение и проверку типов по всей StateSchema.
 *
 * @example
 * const auth = useAppSelector(getUserAuthData);
 */
export const useAppSelector: TypedUseSelectorHook<StateSchema> = useSelector;
