import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { appConfig } from '@/shared/config';

/**
 * Корневой RTK Query API.
 * Все entities делают `rtkApi.injectEndpoints(...)`, что позволяет:
 *   1. иметь один кеш и один список тегов;
 *   2. писать endpoints по FSD-feature/entity (а не одним мега-файлом);
 *   3. не тащить лишние редьюсеры в bundle, если фича не используется.
 */
export const rtkApi = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: appConfig.apiUrl,
  }),
  tagTypes: [
    'Sheet',
    'Defect',
    'DefectCount',
    'References',
    'User',
  ],
  keepUnusedDataFor: 60, // секунды до инвалидации неиспользуемого кэша (default 60)
  endpoints: () => ({}),
});
