import { rtkApi } from '@/shared/api/rtkApi';
import type { UserRole } from '../model/types';
import type { Permission, RolePermissionsData } from '../model/permissions';

const permissionsApi = rtkApi.injectEndpoints({
  endpoints: (build) => ({
    /** Права текущего пользователя */
    getMyPermissions: build.query<{ role: UserRole; permissions: Permission[] }, void>({
      query: () => '/permissions/me',
      providesTags: ['Permissions'],
    }),

    /** Все права и их распределение по ролям (администратор системы) */
    getRolePermissions: build.query<RolePermissionsData, void>({
      query: () => '/rolePermissions',
      providesTags: ['Permissions'],
    }),

    saveRolePermissions: build.mutation<{ role: UserRole; permissions: Permission[] }, { role: UserRole; permissions: Permission[] }>({
      query: ({ role, permissions }) => ({ url: `/rolePermissions/${role}`, method: 'PUT', body: { permissions } }),
      invalidatesTags: ['Permissions'],
    }),
  }),
  overrideExisting: false,
});

export const { useGetMyPermissionsQuery, useGetRolePermissionsQuery, useSaveRolePermissionsMutation } = permissionsApi;
