import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';
import type { StateSchema } from '@/app/providers/StoreProvider';
import { STORAGE_KEYS } from '@/shared/const/storageKeys';
import { getApiUrl } from '@/shared/lib/api/apiUrl';

/**
 * Корневой RTK Query API.
 * baseQuery — динамический: читает URL из localStorage при каждом запросе.
 * Это позволяет менять адрес сервера без пересборки (нужно для Capacitor/Android).
 */
const dynamicBaseQuery: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const baseUrl = getApiUrl();
  const raw = fetchBaseQuery({
    baseUrl,
    prepareHeaders: (headers, { getState }) => {
      const state = getState() as StateSchema;
      const user  = state.user?.authData;

      const token = user?.token ?? localStorage.getItem(STORAGE_KEYS.TOKEN);
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      } else {
        if (user?.filialId != null) headers.set('X-Filial-Id', String(user.filialId));
        if (user?.id)               headers.set('X-User-Id',   String(user.id));
        if (user?.role === 'admin')  headers.set('X-Is-Admin',  'true');
      }

      return headers;
    },
  });
  return raw(args, api, extraOptions);
};

export const rtkApi = createApi({
  reducerPath: 'api',
  baseQuery: dynamicBaseQuery,
  tagTypes: [
    'Sheet',
    'Defect',
    'DefectCount',
    'References',
    'User',
  ],
  keepUnusedDataFor: 60,
  endpoints: () => ({}),
});
