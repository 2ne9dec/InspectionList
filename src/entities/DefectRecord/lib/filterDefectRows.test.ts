import { makeDefect } from '@tests/factories';
import { filterDefectRows } from './filterDefectRows';

const rows = [
  makeDefect({
    id: 1,
    defectId: 10,
    poleNumber: 25,
    defectName: 'Трещина',
    elementName: 'Опора',
    inspectorFind: 'Петров П.П.',
  }),
  makeDefect({
    id: 2,
    defectId: 20,
    poleNumber: 30,
    defectName: 'Разрушен',
    elementName: 'Изолятор',
    inspectorFind: 'Иванов И.И.',
  }),
];

const elementMap = new Map<number, string>([
  [10, '1'],
  [20, '2'],
]);

const emptyFilters = { elementId: '', defectTypeId: '', search: '' };

describe('filterDefectRows', () => {
  it('без фильтров возвращает всё', () => {
    expect(filterDefectRows(rows, emptyFilters, elementMap)).toHaveLength(2);
  });

  it('фильтрует по элементу', () => {
    expect(filterDefectRows(rows, { ...emptyFilters, elementId: '2' }, elementMap)).toEqual([rows[1]]);
  });

  it('фильтрует по виду дефекта', () => {
    expect(filterDefectRows(rows, { ...emptyFilters, defectTypeId: '10' }, elementMap)).toEqual([rows[0]]);
  });

  it('ищет по дефекту, элементу, опоре и обнаружению', () => {
    expect(filterDefectRows(rows, { ...emptyFilters, search: 'трещ' }, elementMap)).toEqual([rows[0]]);
    expect(filterDefectRows(rows, { ...emptyFilters, search: 'изол' }, elementMap)).toEqual([rows[1]]);
    expect(filterDefectRows(rows, { ...emptyFilters, search: '25' }, elementMap)).toEqual([rows[0]]);
    expect(filterDefectRows(rows, { ...emptyFilters, search: 'петров' }, elementMap)).toEqual([rows[0]]);
  });
});
