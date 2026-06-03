import { AnyAction, CombinedState, Reducer, ReducersMapObject } from '@reduxjs/toolkit';
import { EnhancedStore } from '@reduxjs/toolkit/dist/configureStore';
import { rtkApi } from '@/shared/api/rtkApi';
import type { UserSchema } from '@/entities/User';
import type { CreateSheetSchema } from '@/features/CreateSheet';
import type { AddDefectSchema } from '@/features/AddDefect';
import type { FixDefectSchema } from '@/features/FixDefect';
import type { CopyDefectSchema } from '@/features/CopyDefect';

export interface StateSchema {
  [rtkApi.reducerPath]: ReturnType<typeof rtkApi.reducer>;
  user: UserSchema;

  // Async reducers
  createSheet?: CreateSheetSchema;
  addDefect?: AddDefectSchema;
  fixDefect?: FixDefectSchema;
  copyDefect?: CopyDefectSchema;
}

export type StateSchemaKey = keyof StateSchema;
export type MountedReducers = OptionalRecord<StateSchemaKey, boolean>;

export interface ReducerManager {
  getReducerMap: () => ReducersMapObject<StateSchema>;
  reduce: (state: StateSchema, action: AnyAction) => CombinedState<StateSchema>;
  add: (key: StateSchemaKey, reducer: Reducer) => void;
  remove: (key: StateSchemaKey) => void;
  getMountedReducers: () => MountedReducers;
}

export interface ReduxStoreWithManager extends EnhancedStore<StateSchema> {
  reducerManager: ReducerManager;
}

export interface ThunkConfig<T> {
  rejectValue: T;
  state: StateSchema;
}
