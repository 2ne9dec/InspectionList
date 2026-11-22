import { act, renderHook } from '@testing-library/react';
import { configureStore } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { ReactNode } from 'react';
import { Provider } from 'react-redux';
import { describe, expect, it } from 'vitest';
import { buildSlice } from './buildSlice';

interface CounterState {
  value: number;
  label: string;
}

const counterSlice = buildSlice({
  name: 'counter',
  initialState: { value: 0, label: '' } as CounterState,
  reducers: {
    increment(state) {
      state.value += 1;
    },
    addBy(state, action: PayloadAction<number>) {
      state.value += action.payload;
    },
    setLabel(state, action: PayloadAction<string>) {
      state.label = action.payload;
    },
  },
});

function makeStore() {
  return configureStore({ reducer: { counter: counterSlice.reducer } });
}

type Store = ReturnType<typeof makeStore>;

function wrapperFor(store: Store) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <Provider store={store}>{children}</Provider>;
  };
}

describe('buildSlice', () => {
  it('создаёт слайс с начальным состоянием', () => {
    const store = makeStore();

    expect(store.getState().counter).toEqual({ value: 0, label: '' });
  });

  it('прокидывает actions и reducer из createSlice', () => {
    expect(counterSlice.actions.increment).toBeTypeOf('function');
    expect(counterSlice.actions.addBy).toBeTypeOf('function');
    expect(counterSlice.actions.setLabel).toBeTypeOf('function');
  });

  it('возвращает bound action creators, которые меняют store', () => {
    const store = makeStore();
    const { result } = renderHook(() => counterSlice.useActions(), {
      wrapper: wrapperFor(store),
    });

    act(() => result.current.increment());

    expect(store.getState().counter.value).toBe(1);
  });

  it('передаёт payload в экшен', () => {
    const store = makeStore();
    const { result } = renderHook(() => counterSlice.useActions(), {
      wrapper: wrapperFor(store),
    });

    act(() => result.current.addBy(5));

    expect(store.getState().counter.value).toBe(5);
  });

  it('позволяет вызывать несколько экшенов подряд', () => {
    const store = makeStore();
    const { result } = renderHook(() => counterSlice.useActions(), {
      wrapper: wrapperFor(store),
    });

    act(() => {
      result.current.increment();
      result.current.addBy(10);
      result.current.setLabel('линия 1');
    });

    expect(store.getState().counter).toEqual({ value: 11, label: 'линия 1' });
  });

  it('возвращает стабильный объект экшенов между ререндерами', () => {
    const store = makeStore();
    const { result, rerender } = renderHook(() => counterSlice.useActions(), {
      wrapper: wrapperFor(store),
    });
    const firstActions = result.current;

    act(() => result.current.increment());
    rerender();

    expect(result.current).toBe(firstActions);
  });
});
