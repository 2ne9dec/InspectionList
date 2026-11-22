import { useDispatch } from 'react-redux';
import type { AnyAction } from '@reduxjs/toolkit';
import type { ThunkDispatch } from 'redux-thunk';

/** Типизированный dispatch без зависимости shared → app. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AppDispatch = ThunkDispatch<any, unknown, AnyAction>;

// Типизированная версия useDispatch — использовать вместо обычного useDispatch
export const useAppDispatch = () => useDispatch<AppDispatch>();
