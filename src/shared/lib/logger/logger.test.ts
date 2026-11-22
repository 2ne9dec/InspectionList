import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { logger } from './logger';

describe('logger', () => {
  beforeEach(() => {
    vi.spyOn(console, 'debug').mockImplementation(() => undefined);
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('пишет сообщения в консоль с префиксом уровня', () => {
    logger.debug('отладка');
    logger.info('инфо');
    logger.warn('предупреждение');
    logger.error('ошибка');

    expect(console.debug).toHaveBeenCalledWith('[debug]', 'отладка');
    expect(console.info).toHaveBeenCalledWith('[info]', 'инфо');
    expect(console.warn).toHaveBeenCalledWith('[warn]', 'предупреждение');
    expect(console.error).toHaveBeenCalledWith('[error]', 'ошибка');
  });

  it('передаёт дополнительные аргументы как есть', () => {
    const error = new Error('сбой');

    logger.error('Не удалось сохранить', error, { id: 1 });

    expect(console.error).toHaveBeenCalledWith('[error]', 'Не удалось сохранить', error, {
      id: 1,
    });
  });

  it('оповещает подписчиков уровнем и аргументами', () => {
    const listener = vi.fn();
    const unsubscribe = logger.subscribe(listener);

    logger.warn('внимание', 42);

    expect(listener).toHaveBeenCalledWith('warn', ['внимание', 42]);

    unsubscribe();
  });

  it('передаёт события всех уровней', () => {
    const listener = vi.fn();
    const unsubscribe = logger.subscribe(listener);

    logger.debug('d');
    logger.info('i');
    logger.warn('w');
    logger.error('e');

    expect(listener.mock.calls.map(([level]) => level)).toEqual([
      'debug',
      'info',
      'warn',
      'error',
    ]);

    unsubscribe();
  });

  it('прекращает оповещение после отписки', () => {
    const listener = vi.fn();
    const unsubscribe = logger.subscribe(listener);
    unsubscribe();

    logger.error('после отписки');

    expect(listener).not.toHaveBeenCalled();
  });

  it('не прерывает других подписчиков, если один бросил исключение', () => {
    const broken = vi.fn(() => {
      throw new Error('sink упал');
    });
    const healthy = vi.fn();
    const unsubscribeBroken = logger.subscribe(broken);
    const unsubscribeHealthy = logger.subscribe(healthy);

    expect(() => logger.error('сбой')).not.toThrow();
    expect(healthy).toHaveBeenCalledWith('error', ['сбой']);

    unsubscribeBroken();
    unsubscribeHealthy();
  });

  it('поддерживает несколько независимых подписчиков', () => {
    const first = vi.fn();
    const second = vi.fn();
    const unsubscribeFirst = logger.subscribe(first);
    const unsubscribeSecond = logger.subscribe(second);

    logger.info('всем');

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);

    unsubscribeFirst();
    logger.info('только второму');

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(2);

    unsubscribeSecond();
  });
});
