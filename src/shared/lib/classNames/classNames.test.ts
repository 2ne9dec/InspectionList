import { describe, expect, it } from 'vitest';
import { classNames } from './classNames';

describe('classNames', () => {
  it('возвращает только базовый класс без модификаторов', () => {
    expect(classNames('button')).toBe('button');
  });

  it('добавляет модификаторы с истинным значением', () => {
    expect(classNames('button', { active: true, disabled: false })).toBe('button active');
  });

  it('включает строковые модификаторы и пропускает undefined', () => {
    expect(
      classNames('button', { size: 'l', theme: '', empty: undefined }),
    ).toBe('button size');
  });

  it('фильтрует пустые дополнительные классы', () => {
    expect(classNames('button', {}, ['extra', undefined, ''])).toBe('button extra');
  });

  it('сохраняет порядок: базовый, модификаторы, дополнительные', () => {
    expect(classNames('a', { b: true, c: true }, ['d'])).toBe('a b c d');
  });

  it('возвращает базовый класс, если модификаторов и дополнений нет', () => {
    expect(classNames('only', {}, [])).toBe('only');
  });
});
