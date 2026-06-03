import type { StateSchema } from '@/app/providers/StoreProvider';

export const getUserAuthData = (state: StateSchema) => state.user?.authData;
export const getUserInited = (state: StateSchema) => state.user?._inited ?? false;
export const getUserFilialId = (state: StateSchema) => state.user?.authData?.filialId ?? null;
export const getUserIsAdmin = (state: StateSchema) => state.user?.authData?.role === 'admin';
export const getUserDisplayName = (state: StateSchema) => state.user?.authData?.displayName ?? '';
