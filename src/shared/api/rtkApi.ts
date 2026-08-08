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
 * baseQuery — динамический: читает URL из sessionStorage при каждом запросе.
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

      const token = user?.token ?? sessionStorage.getItem(STORAGE_KEYS.TOKEN);
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      } else {
        if (user?.filialId != null) headers.set('X-Filial-Id', String(user.filialId));
        if (user?.id)               headers.set('X-User-Id',   String(user.id));
      }

      return headers;
    },
  });
  return raw(args, api, extraOptions);
};

/**
 * Обёртка с перехватом 401.
 * При истёкшем / недействительном токене очищаем sessionStorage и
 * перезагружаем страницу — SPA покажет экран входа.
 */
const baseQueryWith401: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const result = await dynamicBaseQuery(args, api, extraOptions);
  if (result.error && (result.error as FetchBaseQueryError).status === 401) {
    sessionStorage.clear();
    window.location.href = '/login';
  }
  return result;
};

export const rtkApi = createApi({
  reducerPath: 'api',
  baseQuery:   baseQueryWith401,
  tagTypes:    ['References', 'Sheet', 'Sheets', 'Defect', 'Defects', 'DefectCount', 'User'],
  endpoints:   () => ({}),
});
