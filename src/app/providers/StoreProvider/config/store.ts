/// <reference types="vite/client" />
import { CombinedState, configureStore, Reducer, ReducersMapObject } from '@reduxjs/toolkit';
import { rtkApi } from '@/shared/api/rtkApi';
import { userReducer } from '@/entities/User';
import { createReducerManager } from './reducerManager';
import { StateSchema } from './StateSchema';

export const createReduxStore = (initialState?: StateSchema, asyncReducers?: ReducersMapObject<StateSchema>) => {
  const rootReducer: ReducersMapObject<StateSchema> = {
    ...asyncReducers,
    [rtkApi.reducerPath]: rtkApi.reducer,
    user: userReducer,
  };

  const reducerManager = createReducerManager(rootReducer);

  const store = configureStore({
    reducer: reducerManager.reduce as Reducer<CombinedState<StateSchema>>,
    devTools: import.meta.env?.MODE !== 'production',
    preloadedState: initialState,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          ignoredPaths: [rtkApi.reducerPath],
          warnAfter: 128,
        },
        immutableCheck: {
          ignoredPaths: [rtkApi.reducerPath],
          warnAfter: 128,
        },
      }).concat(rtkApi.middleware),
  });

  // @ts-expect-error -- reducerManager is a custom extension not present in Redux store type
  store.reducerManager = reducerManager;
  return store;
};

export type AppDispatch = ReturnType<typeof createReduxStore>['dispatch'];
