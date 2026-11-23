import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type * as ToastModule from './toastStore';

let toastModule: typeof ToastModule;

describe('toastStore', () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    vi.resetModules();
    toastModule = await import('./toastStore');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('изначально не содержит уведомлений', () => {
    expect(toastModule.toastStore.getSnapshot()).toEqual([]);
  });

  it('добавляет success-уведомление с длительностью по умолчанию', () => {
    const id = toastModule.toast.success('Сохранено');

    const items = toastModule.toastStore.getSnapshot();
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id,
      kind: 'success',
      message: 'Сохранено',
      duration: 3500,
    });
  });

  it('использует увеличенную длительность для ошибок', () => {
    toastModule.toast.error('Не удалось сохранить');

    expect(toastModule.toastStore.getSnapshot()[0]).toMatchObject({
      kind: 'error',
      duration: 6000,
    });
  });

  it('создаёт уведомления всех типов', () => {
    toastModule.toast.success('s');
    toastModule.toast.error('e');
    toastModule.toast.info('i');
    toastModule.toast.warning('w');

    expect(toastModule.toastStore.getSnapshot().map((item) => item.kind)).toEqual([
      'success',
      'error',
      'info',
      'warning',
    ]);
  });

  it('присваивает каждому уведомлению уникальный id', () => {
    const first = toastModule.toast.info('первое');
    const second = toastModule.toast.info('второе');

    expect(first).not.toBe(second);
    expect(toastModule.toastStore.getSnapshot().map((item) => item.id)).toEqual([
      first,
      second,
    ]);
  });

  it('уважает переданную длительность', () => {
    toastModule.toast.success('быстро', { duration: 1000 });

    expect(toastModule.toastStore.getSnapshot()[0].duration).toBe(1000);
  });

  it('автоматически скрывает уведомление по истечении времени', () => {
    toastModule.toast.info('временное');

    vi.advanceTimersByTime(3499);
    expect(toastModule.toastStore.getSnapshot()).toHaveLength(1);

    vi.advanceTimersByTime(1);
    expect(toastModule.toastStore.getSnapshot()).toHaveLength(0);
  });

  it('оставляет уведомление с duration: 0 навсегда', () => {
    toastModule.toast.error('липкое', { duration: 0 });

    vi.advanceTimersByTime(60_000);

    expect(toastModule.toastStore.getSnapshot()).toHaveLength(1);
  });

  it('удаляет уведомление вручную и отменяет автоскрытие', () => {
    const id = toastModule.toast.warning('удалю');

    toastModule.toast.dismiss(id);
    expect(toastModule.toastStore.getSnapshot()).toEqual([]);

    vi.advanceTimersByTime(10_000);
    expect(toastModule.toastStore.getSnapshot()).toEqual([]);
  });

  it('оповещает подписчиков о добавлении и удалении', () => {
    const listener = vi.fn();
    const unsubscribe = toastModule.toastStore.subscribe(listener);

    toastModule.toast.success('привет');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0]).toHaveLength(1);

    vi.advanceTimersByTime(3500);
    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener.mock.calls[1][0]).toEqual([]);

    unsubscribe();
  });

  it('не вызывает отписанного подписчика', () => {
    const listener = vi.fn();
    const unsubscribe = toastModule.toastStore.subscribe(listener);
    unsubscribe();

    toastModule.toast.info('мимо');

    expect(listener).not.toHaveBeenCalled();
  });

  it('поддерживает несколько подписчиков', () => {
    const first = vi.fn();
    const second = vi.fn();
    const unsubscribeFirst = toastModule.toastStore.subscribe(first);
    const unsubscribeSecond = toastModule.toastStore.subscribe(second);

    toastModule.toast.info('всем');

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);

    unsubscribeFirst();
    unsubscribeSecond();
  });

  it('возвращает актуальный снимок после каждого изменения', () => {
    const firstId = toastModule.toast.info('первое');
    const secondId = toastModule.toast.info('второе');

    toastModule.toast.dismiss(firstId);

    expect(toastModule.toastStore.getSnapshot()).toEqual([
      expect.objectContaining({ id: secondId }),
    ]);
  });
});
