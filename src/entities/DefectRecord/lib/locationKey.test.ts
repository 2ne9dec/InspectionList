import { formatLocationLabel, getLocationKey, locationKeyType } from './locationKey';

describe('locationKey', () => {
  it('строит ключ опоры и пролёта', () => {
    expect(getLocationKey({ poleNumber: 25, spanRange: null })).toBe('о:25');
    expect(getLocationKey({ poleNumber: 0, spanRange: '250-300' })).toBe('п:250-300');
  });

  it('приоритет у пролёта', () => {
    expect(getLocationKey({ poleNumber: 25, spanRange: '20-30' })).toBe('п:20-30');
  });

  it('возвращает подпись без префикса', () => {
    expect(formatLocationLabel('о:25')).toBe('25');
    expect(formatLocationLabel('п:250-300')).toBe('250-300');
  });

  it('определяет тип места', () => {
    expect(locationKeyType('о:25')).toBe('pole');
    expect(locationKeyType('п:250-300')).toBe('span');
  });
});
