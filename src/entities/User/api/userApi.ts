import { rtkApi } from '@/shared/api/rtkApi';
import type { User, UserProfile, UserRole } from '../model/types';

export interface UpdateUserParams {
  id: string;
  displayName: string;
}

export interface ChangePasswordParams {
  oldPass: string;
  newPass: string;
}

export interface CreateUserParams {
  username: string;
  password: string;
  displayName: string;
  role: UserRole;
  filialId: number | null;
}

/** У каждого филиала своя база: филиал пользователя определяет, в какой базе он хранится. */
const userQs = (filialId: number | null) => `?filialId=${filialId ?? ''}`;

export interface AdminUpdateUserParams {
  id: string;
  /** Филиал пользователя (база, где он хранится); null — пользователь РУП */
  userFilialId: number | null;
  username?: string;
  displayName?: string;
  role?: UserRole;
  filialId?: number | null;
}

export interface ResetPasswordParams {
  id: string;
  userFilialId: number | null;
  newPass: string;
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

    /** POST /changePassword — сменить свой пароль; сервер возвращает профиль и новый токен */
    changePassword: build.mutation<User, ChangePasswordParams>({
      query: (body) => ({
        url: '/changePassword',
        method: 'POST',
        body,
      }),
    }),

    // ── Админ-панель ──────────────────────────────────────────────────────────

    /** GET /users — пользователи (главный администратор — все, администратор филиала — своего филиала) */
    getUsers: build.query<UserProfile[], void>({
      query: () => '/users',
      providesTags: ['User'],
    }),

    createUser: build.mutation<UserProfile, CreateUserParams>({
      query: (body) => ({ url: '/users', method: 'POST', body }),
      invalidatesTags: ['User'],
    }),

    adminUpdateUser: build.mutation<UserProfile, AdminUpdateUserParams>({
      query: ({ id, userFilialId, ...body }) => ({ url: `/users/${id}${userQs(userFilialId)}`, method: 'PATCH', body }),
      invalidatesTags: ['User'],
    }),

    deleteUser: build.mutation<{ ok: boolean }, { id: string; userFilialId: number | null }>({
      query: ({ id, userFilialId }) => ({ url: `/users/${id}${userQs(userFilialId)}`, method: 'DELETE' }),
      invalidatesTags: ['User'],
    }),

    /** Задать временный пароль: пользователь сменит его при входе */
    resetPassword: build.mutation<{ ok: boolean }, ResetPasswordParams>({
      query: ({ id, userFilialId, newPass }) => ({ url: `/users/${id}/resetPassword${userQs(userFilialId)}`, method: 'POST', body: { newPass } }),
      invalidatesTags: ['User'],
    }),
  }),
  overrideExisting: false,
});

export const {
  useUpdateUserMutation,
  useChangePasswordMutation,
  useGetUsersQuery,
  useCreateUserMutation,
  useAdminUpdateUserMutation,
  useDeleteUserMutation,
  useResetPasswordMutation,
} = userApi;
