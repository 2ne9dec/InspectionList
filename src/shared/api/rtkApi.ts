import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { appConfig } from '@/shared/config';
import type { StateSchema } from '@/app/providers/StoreProvider';
import { STORAGE_KEYS } from '@/shared/const/storageKeys';

/**
 * Корневой RTK Query API.
 * Все entities делают `rtkApi.injectEndpoints(...)`, что позволяет:
 *   1. иметь один кеш и один список тегов;
 *   2. писать endpoints по FSD-feature/entity (а не одним мега-файлом);
 *   3. не тащить лишние редьюсеры в bundle, если фича не используется.
 *
 * prepareHeaders добавляет Authorization: Bearer <token> если токен есть.
 * Для offline-режима (Dexie queryFn) заголовки не используются.
 */
export const rtkApi = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: appConfig.apiUrl,
    prepareHeaders: (headers, { getState }) => {
      const state = getState() as StateSchema;
      const user  = state.user?.authData;

      // Токен читается из sessionStorage (сохраняется loginThunk при JWT-логине)
      const token = user?.token ?? sessionStorage.getItem(STORAGE_KEYS.TOKEN);
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      } else {
        // Fallback: header-based auth для dev-режима без JWT
        if (user?.filialId != null) headers.set('X-Filial-Id', String(user.filialId));
        if (user?.id)               headers.set('X-User-Id',   String(user.id));
        if (user?.role === 'admin')  headers.set('X-Is-Admin',  'true');
      }

      return headers;
    },
  }),
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
