import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { STORAGE_KEYS } from '@/shared/const/storageKeys';
import type { User, UserSchema } from './types';

const USER_KEY = STORAGE_KEYS.USER;
// sessionStorage — сессия сохраняется при перезапуске Capacitor/браузера

const initialState: UserSchema = {
  _inited: false,
};

export const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setAuthData: (state, action: PayloadAction<User>) => {
      state.authData = action.payload;
    },
    initAuthData: (state) => {
      const raw = sessionStorage.getItem(USER_KEY);
      if (raw) {
        try {
          state.authData = JSON.parse(raw);
        } catch {}
      }
      const view = Number(sessionStorage.getItem(STORAGE_KEYS.VIEW_FILIAL));
      state.viewFilialId = Number.isInteger(view) && view > 0 ? view : null;
      state._inited = true;
    },
    /** Выбор филиала пользователем без филиала (переключатель в шапке). */
    setViewFilialId: (state, action: PayloadAction<number | null>) => {
      state.viewFilialId = action.payload;
      if (action.payload != null) sessionStorage.setItem(STORAGE_KEYS.VIEW_FILIAL, String(action.payload));
      else sessionStorage.removeItem(STORAGE_KEYS.VIEW_FILIAL);
    },
    logout: (state) => {
      state.authData = undefined;
      state.viewFilialId = null;
      sessionStorage.removeItem(USER_KEY);
      sessionStorage.removeItem(STORAGE_KEYS.VIEW_FILIAL);
    },
  },
});

export const USER_LOCALSTORAGE_KEY = STORAGE_KEYS.USER;
export const userActions = userSlice.actions;
export const userReducer = userSlice.reducer;
