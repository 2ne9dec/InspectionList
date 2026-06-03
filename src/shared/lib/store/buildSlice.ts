import { bindActionCreators, createSlice } from '@reduxjs/toolkit';
import type { SliceCaseReducers, CreateSliceOptions } from '@reduxjs/toolkit';
import { useDispatch } from 'react-redux';
import { useMemo } from 'react';

/**
 * Тонкая обёртка над createSlice — добавляет хук `useActions()`,
 * возвращающий мемоизированные bound-action-creators.
 *
 * Использование:
 *   const { openModal, setSearch } = mySlice.useActions();
 */
export function buildSlice<
  State,
  CaseReducers extends SliceCaseReducers<State>,
  Name extends string = string,
>(options: CreateSliceOptions<State, CaseReducers, Name>) {
  const slice = createSlice(options);

  const useActions = (): typeof slice.actions => {
    const dispatch = useDispatch();
    return useMemo(
      // Типы Redux Toolkit здесь слишком сложны, чтобы выразить точно;
      // bindActionCreators корректен в рантайме — сужаем через unknown.
      () => bindActionCreators(slice.actions as unknown as Record<string, (...args: unknown[]) => unknown>, dispatch) as unknown as typeof slice.actions,
      [dispatch],
    );
  };

  return {
    ...slice,
    useActions,
  };
}
