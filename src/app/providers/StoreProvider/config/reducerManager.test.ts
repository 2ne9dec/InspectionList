import type { Reducer } from '@reduxjs/toolkit';
import { describe, expect, it } from 'vitest';
import { createReducerManager } from './reducerManager';

const counter: Reducer<number> = (state = 0, action) =>
  action.type === 'increment' ? state + 1 : state;

const flag: Reducer<boolean> = (state = false, action) =>
  action.type === 'enable' ? true : state;

type TestManager = ReturnType<typeof createReducerManager>;

const reducerMap = (manager: TestManager) =>
  manager.getReducerMap() as unknown as Record<string, unknown>;

const mountedReducers = (manager: TestManager) =>
  manager.getMountedReducers() as unknown as Record<string, boolean | undefined>;

describe('createReducerManager', () => {
  it('возвращает начальную карту редьюсеров', () => {
    const manager = createReducerManager({ counter } as never);
    expect(reducerMap(manager).counter).toBe(counter);
  });

  it('добавляет и монтирует редьюсер', () => {
    const manager = createReducerManager({ counter } as never);
    manager.add('flag' as never, flag);

    expect(reducerMap(manager).flag).toBe(flag);
    expect(mountedReducers(manager).flag).toBe(true);
  });

  it('удаляет редьюсер и очищает его состояние', () => {
    const manager = createReducerManager({ counter, flag } as never);
    manager.remove('flag' as never);

    expect(mountedReducers(manager).flag).toBe(false);
    expect(reducerMap(manager).flag).toBeUndefined();

    const state = manager.reduce({ counter: 1, flag: true } as never, { type: 'unknown' });
    expect(state).not.toHaveProperty('flag');
  });

  it('не добавляет повторно тот же редьюсер', () => {
    const manager = createReducerManager({ counter } as never);
    manager.add('counter' as never, flag);
    expect(reducerMap(manager).counter).toBe(counter);
  });
});
