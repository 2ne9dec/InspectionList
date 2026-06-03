import { createAsyncThunk } from '@reduxjs/toolkit';
import type { ThunkConfig } from '@/app/providers/StoreProvider';
import { userActions } from '@/entities/User';
import type { User } from '@/entities/User';
import { appConfig } from '@/shared/config';
import { STORAGE_KEYS } from '@/shared/const/storageKeys';

const USER_KEY = STORAGE_KEYS.USER;

export const loginByUsername = createAsyncThunk<User, { username: string; password: string }, ThunkConfig<string>>(
  'auth/loginByUsername',
  async ({ username, password }, { dispatch, rejectWithValue }) => {
    try {
      const res = await fetch(`${appConfig.apiUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const err = await res.json();
        return rejectWithValue(err.error ?? 'Ошибка авторизации');
      }
      const user: User = await res.json();
      sessionStorage.setItem(USER_KEY, JSON.stringify(user));
      dispatch(userActions.setAuthData(user));
      return user;
    } catch {
      return rejectWithValue('Сервер недоступен');
    }
  },
);
