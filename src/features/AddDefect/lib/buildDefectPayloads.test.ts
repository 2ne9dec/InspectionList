import { buildDefectPayloads } from './buildDefectPayloads';

const phases = [
  { id: 3, name: 'C' },
  { id: 1, name: 'A' },
];

const base = {
  selectedDefectId: 77,
  isCustom: false,
  selectedPhaseIds: [3, 1],
  phases,
  poleStart: 1,
  poleEnd: 5,
  poleNumber: '1-3',
  spanRange: '',
  mode: 'pole' as const,
  inspector: '  Иванов И.И.  ',
  dateFound: '2026-01-01',
  insulatorCount: '',
  garlandNumber: '2',
  customNameTrimmed: '',
};

describe('buildDefectPayloads', () => {
  it('строит payload для нескольких опор и фаз', () => {
    const result = buildDefectPayloads(base);

    expect(result.poleCount).toBe(3);
    expect(result.scrollTarget).toBe('о:1');
    expect(result.payloads).toHaveLength(6);
    expect(result.payloads.map((p) => p.phaseId)).toEqual([1, 3, 1, 3, 1, 3]);
    expect(result.payloads[0]).toMatchObject({
      poleNumber: 1,
      defectId: 77,
      inspectorFind: 'Иванов И.И.',
      insulatorCount: null,
      garlandNumber: 2,
      spanRange: null,
      notes: null,
      customName: null,
    });
  });

  it('без фаз создаёт одну запись на опору с phaseId=null', () => {
    const result = buildDefectPayloads({ ...base, selectedPhaseIds: [] });

    expect(result.payloads).toHaveLength(3);
    expect(result.payloads.every((p) => p.phaseId === null)).toBe(true);
  });

  it('строит payload для пролёта', () => {
    const result = buildDefectPayloads({
      ...base,
      mode: 'span',
      poleNumber: '',
      spanRange: '  4-6  ',
      selectedPhaseIds: [1],
    });

    expect(result.poleCount).toBe(0);
    expect(result.scrollTarget).toBe('п:4-6');
    expect(result.payloads).toEqual([
      expect.objectContaining({
        poleNumber: 0,
        phaseId: 1,
        spanRange: '4-6',
      }),
    ]);
  });

  it('записывает customName только для своего дефекта', () => {
    const result = buildDefectPayloads({
      ...base,
      isCustom: true,
      customNameTrimmed: '  Трещина  ',
      selectedPhaseIds: [],
      poleNumber: '1',
    });

    expect(result.payloads[0].customName).toBe('Трещина');
  });
});
