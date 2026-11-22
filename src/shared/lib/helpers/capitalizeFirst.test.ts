import { describe, expect, it } from 'vitest';
import { capitalizeFirst } from './capitalizeFirst';

describe('capitalizeFirst', () => {
  it('делает первую букву заглавной', () => {
    expect(capitalizeFirst('опора')).toBe('Опора');
  });

  it('не меняет регистр остальных символов', () => {
    expect(capitalizeFirst('иСПЫТАНИЕ')).toBe('ИСПЫТАНИЕ');
  });

  it('возвращает строку без изменений, если первая буква уже заглавная', () => {
    expect(capitalizeFirst('Линия')).toBe('Линия');
  });

  it('работает со строкой из одного символа', () => {
    expect(capitalizeFirst('a')).toBe('A');
  });

  it('возвращает пустую строку как есть', () => {
    expect(capitalizeFirst('')).toBe('');
  });

  it('не падает на строке из пробелов', () => {
    expect(capitalizeFirst('   ')).toBe('   ');
  });
});
