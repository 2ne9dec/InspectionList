import { createAsyncThunk } from '@reduxjs/toolkit';
import { authenticateOffline, hasOfflineCredentials, saveOfflineCredentials, userActions } from '@/entities/User';
import type { User } from '@/entities/User';
import { getApiUrl } from '@/shared/lib/api/apiUrl';
import { STORAGE_KEYS } from '@/shared/const/storageKeys';
import { rtkApi } from '@/shared/api/rtkApi';

const USER_KEY  = STORAGE_KEYS.USER;
const TOKEN_KEY = STORAGE_KEYS.TOKEN;

interface LoginThunkState {
  user?: { authData?: User };
}

interface LoginThunkConfig {
  rejectValue: string;
  state: LoginThunkState;
}

// Офлайн-таблица пользователей (SHA-256 хэши, lazy-migrate к bcrypt на сервере).
// Используется только когда сервер недоступен (Capacitor offline-режим).
// Фильтруем по VITE_FILIAL_ID — в бандл попадает только пользователь своего филиала.
// VITE_FILIAL_ID задаётся в .env перед yarn build (через prepare-seed.js).
const _OFFLINE_FILIAL = Number(import.meta.env.VITE_FILIAL_ID ?? 0);

const OFFLINE_USERS: Array<Omit<User, 'allowedVoltageIds' | 'allowedLineIds'> & { allowedVoltageIds: null; allowedLineIds: null; password: string; filialId: number }> = ([
  { id: '1',      username: 'gomel',    password: 'f60268750b6405c74ce4d46b80118a16dd4a9e919440f729b6fd9f8d756be2a1', filialId: 1,    role: 'director', displayName: 'Гомельские ЭС',   allowedVoltageIds: null, allowedLineIds: null },
  { id: '2',      username: 'zhlobin',  password: 'b314cc24886aced6d9d56d21d4d6673b7c87bb4aab4d1b06aa1dc30e90b701a8', filialId: 2,    role: 'director', displayName: 'Жлобинские ЭС',   allowedVoltageIds: null, allowedLineIds: null },
  { id: '3',      username: 'mozyr',    password: '86eacd01dabc63d6975d95d0a0efcc4948503b9959aa9d8914b105d9f2eadf03', filialId: 3,    role: 'director', displayName: 'Мозырские ЭС',    allowedVoltageIds: null, allowedLineIds: null },
  { id: '4',      username: 'rechitsa', password: '5d475f5ba840d653710b399e00efc463f7b9de7d39d4523a9b42796595a1fdfe', filialId: 4,    role: 'director', displayName: 'Речицкие ЭС',    allowedVoltageIds: null, allowedLineIds: null },
] as typeof OFFLINE_USERS).filter(u => !_OFFLINE_FILIAL || u.filialId === _OFFLINE_FILIAL);

async function sha256(str: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const loginByUsername = createAsyncThunk<User, { username: string; password: string; filialId?: string }, LoginThunkConfig>(
  'auth/loginByUsername',
  async ({ username, password, filialId }, { dispatch, rejectWithValue }) => {
    // ── 1. Пытаемся войти через сервер (JWT) ────────────────────────────────
    const hasNetwork = typeof navigator === 'undefined' || navigator.onLine;
    let authTimeoutId: ReturnType<typeof setTimeout> | undefined;
    if (hasNetwork) try {
      // AbortSignal.timeout поддерживается не во всех WebView — делаем вручную.
      const controller = new AbortController();
      authTimeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`${getApiUrl()}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // filialId — филиал со страницы входа ('rup' — РУП); без него входит только администратор системы
        body: JSON.stringify({ username: username.trim().toLowerCase(), password, filialId }),
        // Таймаут 4 сек — если сервер недоступен, переходим в офлайн
        signal: controller.signal,
      });

      if (res.ok) {
        const data: User & { token?: string } = await res.json();
        if (data.token) sessionStorage.setItem(TOKEN_KEY, data.token);
        const { token: _t, ...user } = data;
        sessionStorage.setItem(USER_KEY, JSON.stringify(user));
        // Запоминаем вход для работы без сети. Пароль не хранится — только соль и хеш.
        try { await saveOfflineCredentials(user, password, data.token); } catch { /* не блокируем вход */ }
        dispatch(rtkApi.util.resetApiState());
        dispatch(userActions.setAuthData(user));
        return user;
      }

      // Сервер ответил ошибкой (неверный пароль и т.д.)
      const err = await res.json().catch(() => ({}));
      return rejectWithValue(err.error ?? 'Ошибка авторизации');
    } catch {
      // Сервер недоступен — переходим в офлайн-режим
    } finally {
      if (authTimeoutId) clearTimeout(authTimeoutId);
    }

    // ── 2. Офлайн-режим: проверяем SHA-256 из встроенной таблицы ────────────
    // Сюда попадаем, только если сервер не ответил: говорим об этом прямо,
    // иначе «пользователь не найден» выглядит как ошибка в логине
    // Сначала проверяем реального пользователя, который уже входил на этом устройстве.
    const cached = await authenticateOffline(username, password, filialId);
    if (cached) {
      if (cached.user.mustChangePassword) {
        return rejectWithValue('Сначала смените пароль при доступном сервере.');
      }
      if (cached.token) sessionStorage.setItem(TOKEN_KEY, cached.token);
      sessionStorage.setItem(USER_KEY, JSON.stringify(cached.user));
      dispatch(rtkApi.util.resetApiState());
      dispatch(userActions.setAuthData(cached.user));
      return cached.user;
    }

    const found = OFFLINE_USERS.find((u) => u.username === username.trim().toLowerCase());
    if (!found) {
      return rejectWithValue(
        hasOfflineCredentials()
          ? `Сервер недоступен. Для «${username.trim()}» нет сохранённого входа на этом устройстве.`
          : 'Сервер недоступен. Первый вход должен быть выполнен при доступном сервере — после этого вход будет работать без сети.',
      );
    }

    let hash: string | null = null;
    try { hash = await sha256(password); } catch { hash = null; }
    if (!hash) return rejectWithValue('Сервер недоступен. Офлайн-вход недоступен в этом браузере.');
    if (hash !== found.password) return rejectWithValue('Сервер недоступен: неверный пароль');

    const { password: _omit, ...user } = found;
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));
    dispatch(userActions.setAuthData(user));
    return user;
  },
);
