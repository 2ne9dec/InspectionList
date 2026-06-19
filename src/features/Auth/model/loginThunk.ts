import { createAsyncThunk } from '@reduxjs/toolkit';
import type { ThunkConfig } from '@/app/providers/StoreProvider';
import { userActions } from '@/entities/User';
import type { User } from '@/entities/User';
import { appConfig } from '@/shared/config';
import { STORAGE_KEYS } from '@/shared/const/storageKeys';
import { rtkApi } from '@/shared/api/rtkApi';

const USER_KEY  = STORAGE_KEYS.USER;
const TOKEN_KEY = STORAGE_KEYS.TOKEN;

// Офлайн-таблица пользователей (SHA-256 хэши, lazy-migrate к bcrypt на сервере).
// Используется только когда сервер недоступен (Capacitor offline-режим).
const OFFLINE_USERS: Array<Omit<User, 'allowedVoltageIds' | 'allowedLineIds'> & { allowedVoltageIds: null; allowedLineIds: null; password: string }> = [
  { id: 'admin',  username: 'admin',    password: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', filialId: null, role: 'admin',    displayName: 'Администратор',   allowedVoltageIds: null, allowedLineIds: null },
  { id: '1',      username: 'gomel',    password: 'f60268750b6405c74ce4d46b80118a16dd4a9e919440f729b6fd9f8d756be2a1', filialId: 1,    role: 'director', displayName: 'Гомельские ЭС',   allowedVoltageIds: null, allowedLineIds: null },
  { id: '2',      username: 'zhlobin',  password: 'b314cc24886aced6d9d56d21d4d6673b7c87bb4aab4d1b06aa1dc30e90b701a8', filialId: 2,    role: 'director', displayName: 'Жлобинские ЭС',   allowedVoltageIds: null, allowedLineIds: null },
  { id: '3',      username: 'mozyr',    password: '86eacd01dabc63d6975d95d0a0efcc4948503b9959aa9d8914b105d9f2eadf03', filialId: 3,    role: 'director', displayName: 'Мозырские ЭС',    allowedVoltageIds: null, allowedLineIds: null },
  { id: '4',      username: 'rechitsa', password: '5d475f5ba840d653710b399e00efc463f7b9de7d39d4523a9b42796595a1fdfe', filialId: 4,    role: 'director', displayName: 'Речицкие ЭС',    allowedVoltageIds: null, allowedLineIds: null },
];

async function sha256(str: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const loginByUsername = createAsyncThunk<User, { username: string; password: string }, ThunkConfig<string>>(
  'auth/loginByUsername',
  async ({ username, password }, { dispatch, rejectWithValue }) => {
    // ── 1. Пытаемся войти через сервер (JWT) ────────────────────────────────
    try {
      const res = await fetch(`${appConfig.apiUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim().toLowerCase(), password }),
        // Таймаут 3 сек — если сервер недоступен, сразу переходим в офлайн
        signal: AbortSignal.timeout(3000),
      });

      if (res.ok) {
        const data: User & { token?: string } = await res.json();
        if (data.token) sessionStorage.setItem(TOKEN_KEY, data.token);
        const { token: _t, ...user } = data;
        sessionStorage.setItem(USER_KEY, JSON.stringify(user));
        dispatch(rtkApi.util.resetApiState());
        dispatch(userActions.setAuthData(user));
        return user;
      }

      // Сервер ответил ошибкой (неверный пароль и т.д.)
      const err = await res.json().catch(() => ({}));
      return rejectWithValue(err.error ?? 'Ошибка авторизации');
    } catch {
      // Сервер недоступен — переходим в офлайн-режим
    }

    // ── 2. Офлайн-режим: проверяем SHA-256 из встроенной таблицы ────────────
    const found = OFFLINE_USERS.find((u) => u.username === username.trim().toLowerCase());
    if (!found) return rejectWithValue('Пользователь не найден');

    const hash = await sha256(password);
    if (hash !== found.password) return rejectWithValue('Неверный пароль');

    const { password: _omit, ...user } = found;
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));
    dispatch(userActions.setAuthData(user));
    return user;
  },
);
