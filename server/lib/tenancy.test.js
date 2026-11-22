// @vitest-environment node
const { canAccessLine, canAccessFilial, lineWhereClause, filterByTenancy } = require('./tenancy');

describe('tenancy', () => {
  describe('canAccessLine', () => {
    it('разрешает всё без ограничений', () => {
      expect(canAccessLine({ allowedLineIds: null }, 123)).toBe(true);
    });

    it('проверяет линию по Set', () => {
      const req = { allowedLineIds: new Set([1, 2]) };
      expect(canAccessLine(req, 1)).toBe(true);
      expect(canAccessLine(req, '2')).toBe(true);
      expect(canAccessLine(req, 3)).toBe(false);
    });
  });

  describe('canAccessFilial', () => {
    it('разрешает всё глобальному пользователю', () => {
      expect(canAccessFilial({ filialId: null }, 5)).toBe(true);
    });

    it('сравнивает филиал как число', () => {
      const req = { filialId: 2 };
      expect(canAccessFilial(req, 2)).toBe(true);
      expect(canAccessFilial(req, '2')).toBe(true);
      expect(canAccessFilial(req, 3)).toBe(false);
      expect(canAccessFilial(req, null)).toBe(false);
    });
  });

  describe('lineWhereClause', () => {
    it('без ограничений не добавляет SQL', () => {
      expect(lineWhereClause({ allowedLineIds: null })).toEqual({ sql: '', params: [] });
    });

    it('пустой Set блокирует все строки', () => {
      expect(lineWhereClause({ allowedLineIds: new Set() })).toEqual({ sql: ' AND 1=0', params: [] });
    });

    it('строит IN с параметрами', () => {
      const result = lineWhereClause({ allowedLineIds: new Set([2, 1]) });
      expect(result.sql).toBe(' AND LINE_ID IN (?,?)');
      expect(result.params).toEqual([2, 1]);
    });
  });

  describe('filterByTenancy', () => {
    it('фильтрует элементы по lineId', () => {
      const req = { allowedLineIds: new Set([1]) };
      const items = [{ lineId: 1 }, { lineId: 2 }];
      expect(filterByTenancy(req, items)).toEqual([{ lineId: 1 }]);
    });

    it('оставляет элементы без lineId', () => {
      const req = { allowedLineIds: new Set([1]) };
      expect(filterByTenancy(req, [{ lineId: null }])).toEqual([{ lineId: null }]);
    });
  });
});
