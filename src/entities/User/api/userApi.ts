import { rtkApi } from '@/shared/api/rtkApi';
import type { User } from '../model/types';

export interface UpdateUserParams {
  id: string;
  displayName: string;
}

export interface ChangePasswordParams {
  id: string;
  oldPass: string;
  newPass: string;
}

export interface ChangePasswordError {
  error: string;
}

const userApi = rtkApi.injectEndpoints({
  endpoints: (build) => ({
    /** PATCH /users/:id — обновить displayName */
    updateUser: build.mutation<User, UpdateUserParams>({
      query: ({ id, displayName }) => ({
        url: `/users/${id}`,
        method: 'PATCH',
        body: { displayName },
      }),
      invalidatesTags: ['User'],
    }),

    /** POST /changePassword — сменить пароль */
    changePassword: build.mutation<void, ChangePasswordParams>({
      query: (body) => ({
        url: '/changePassword',
        method: 'POST',
        body,
      }),
    }),
  }),
  overrideExisting: false,
});

export const { useUpdateUserMutation, useChangePasswordMutation } = userApi;
