import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { STORAGE_KEYS } from '@/shared/const/storageKeys';
import type { User, UserSchema } from './types';

const USER_KEY = STORAGE_KEYS.USER;
// sessionStorage очищается при закрытии браузера — автоматический разлогин

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
      state._inited = true;
    },
    logout: (state) => {
      state.authData = undefined;
      sessionStorage.removeItem(USER_KEY);
    },
  },
});

export const USER_LOCALSTORAGE_KEY = STORAGE_KEYS.USER;
export const userActions = userSlice.actions;
export const userReducer = userSlice.reducer;
