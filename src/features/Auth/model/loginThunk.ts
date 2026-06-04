import { createAsyncThunk } from '@reduxjs/toolkit';
import type { ThunkConfig } from '@/app/providers/StoreProvider';
import { userActions } from '@/entities/User';
import type { User } from '@/entities/User';
import { STORAGE_KEYS } from '@/shared/const/storageKeys';

// Пользователи зашиты в сборку — авторизация работает без сервера
const USERS: Array<User & { password: string }> = [
  { id: 'admin',  username: 'admin',   password: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', filialId: null, role: 'admin', displayName: 'Администратор' },
  { id: '1',      username: 'gomel',   password: 'f60268750b6405c74ce4d46b80118a16dd4a9e919440f729b6fd9f8d756be2a1', filialId: 1,    role: 'user',  displayName: 'Гомельские ЭС' },
  { id: '2',      username: 'zhlobin', password: 'b314cc24886aced6d9d56d21d4d6673b7c87bb4aab4d1b06aa1dc30e90b701a8', filialId: 2,    role: 'user',  displayName: 'Жлобинские ЭС' },
  { id: '3',      username: 'mozyr',   password: '86eacd01dabc63d6975d95d0a0efcc4948503b9959aa9d8914b105d9f2eadf03', filialId: 3,    role: 'user',  displayName: 'Мозырские ЭС' },
  { id: '4',      username: 'rechitsa',password: '5d475f5ba840d653710b399e00efc463f7b9de7d39d4523a9b42796595a1fdfe', filialId: 4,    role: 'user',  displayName: 'Речицкие ЭС' },
];

async function sha256(str: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const loginByUsername = createAsyncThunk<User, { username: string; password: string }, ThunkConfig<string>>(
  'auth/loginByUsername',
  async ({ username, password }, { dispatch, rejectWithValue }) => {
    const found = USERS.find((u) => u.username === username.trim().toLowerCase());
    if (!found) return rejectWithValue('Пользователь не найден');

    const hash = await sha256(password);
    if (hash !== found.password) return rejectWithValue('Неверный пароль');

    const { password: _omit, ...user } = found;
    sessionStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    dispatch(userActions.setAuthData(user));
    return user;
  },
);
