import { useEffect } from 'react';
import type { Reducer } from '@reduxjs/toolkit';
import type { ReactNode } from 'react';
import { useStore } from 'react-redux';
import { useAppDispatch } from '@/shared/lib/hooks/useAppDispatch/useAppDispatch';
import type {
  ReduxStoreWithManager,
  StateSchema,
  StateSchemaKey,
} from '@/app/providers/StoreProvider';

export type ReducersList = {
  [name in StateSchemaKey]?: Reducer<NonNullable<StateSchema[name]>>;
};

interface DynamicModuleLoaderProps {
  children: ReactNode;
  reducers: ReducersList;
  /** Удалять ли redux-модули при unmount. По-умолчанию true. */
  removeAfterUnmount?: boolean;
}

/**
 * Динамически подключает feature-редьюсеры при монтировании и отключает при размонтировании.
 * Хранилище не содержит state неактивных фич.
 */
export const DynamicModuleLoader = (props: DynamicModuleLoaderProps) => {
  const { children, reducers, removeAfterUnmount = true } = props;

  const dispatch = useAppDispatch();
  const store = useStore() as ReduxStoreWithManager;

  useEffect(() => {
    const mountedReducers = store.reducerManager.getMountedReducers();

    (Object.entries(reducers) as Array<[StateSchemaKey, Reducer | undefined]>).forEach(
      ([name, reducer]) => {
        if (!reducer) return;
        const isMounted = mountedReducers[name];
        if (!isMounted) {
          store.reducerManager.add(name, reducer);
          dispatch({ type: `@INIT ${name} reducer` });
        }
      },
    );

    return () => {
      if (!removeAfterUnmount) return;
      (Object.keys(reducers) as StateSchemaKey[]).forEach((name) => {
        store.reducerManager.remove(name);
        dispatch({ type: `@DESTROY ${name} reducer` });
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
};
