import { parsePoleList } from './location';
import type { LocationMode } from '../model/addDefectSlice';

interface PhaseLike {
  id: number;
  name: string;
}

export interface DefectPayload {
  poleNumber: number;
  phaseId: number | null;
  defectId: number;
  dateFound: string;
  inspectorFind: string;
  insulatorCount: number | null;
  spanRange: string | null;
  garlandNumber: number | null;
  notes: null;
  customName: string | null;
}

interface BuildDefectPayloadsParams {
  selectedDefectId: number;
  isCustom: boolean;
  selectedPhaseIds: number[];
  phases: ReadonlyArray<PhaseLike>;
  poleStart: number;
  poleEnd: number;
  poleNumber: string;
  spanRange: string;
  mode: LocationMode;
  inspector: string;
  dateFound: string;
  insulatorCount: string;
  garlandNumber: string;
  customNameTrimmed: string;
}

interface BuildDefectPayloadsResult {
  payloads: DefectPayload[];
  /** Количество опор (только для режима «опора»). */
  poleCount: number;
  /** Селектор для прокрутки к месту после добавления. */
  scrollTarget: string;
}

/**
 * Собирает payload'ы дефектов для онлайн- и офлайн-добавления.
 * Одна фаза без выбора = одна запись с phaseId=null.
 */
export function buildDefectPayloads(params: BuildDefectPayloadsParams): BuildDefectPayloadsResult {
  const {
    selectedDefectId,
    isCustom,
    selectedPhaseIds,
    phases,
    poleStart,
    poleEnd,
    poleNumber,
    spanRange,
    mode,
    inspector,
    dateFound,
    insulatorCount,
    garlandNumber,
    customNameTrimmed,
  } = params;

  const sortedPhaseIds = selectedPhaseIds.length > 0
    ? [...selectedPhaseIds].sort((a, b) => {
        const nameA = phases.find((p) => p.id === a)?.name ?? '';
        const nameB = phases.find((p) => p.id === b)?.name ?? '';
        return nameA.localeCompare(nameB);
      })
    : [];
  const phaseIds: Array<number | null> = sortedPhaseIds.length > 0 ? sortedPhaseIds : [null];

  const base = {
    defectId: selectedDefectId,
    dateFound,
    inspectorFind: inspector.trim(),
    insulatorCount: insulatorCount ? Number(insulatorCount) : null,
    garlandNumber: garlandNumber ? Number(garlandNumber) : null,
    notes: null,
    customName: isCustom ? customNameTrimmed.trim() : null,
  };

  if (mode === 'pole') {
    const poles = parsePoleList(poleNumber, poleStart, poleEnd);
    const payloads = poles.flatMap((pole) =>
      phaseIds.map((phaseId) => ({
        ...base,
        poleNumber: pole,
        phaseId,
        spanRange: null,
      })),
    );
    return {
      payloads,
      poleCount: poles.length,
      scrollTarget: `о:${poles[0]}`,
    };
  }

  const trimmedSpan = spanRange.trim();
  return {
    payloads: phaseIds.map((phaseId) => ({
      ...base,
      poleNumber: 0,
      phaseId,
      spanRange: trimmedSpan,
    })),
    poleCount: 0,
    scrollTarget: `п:${trimmedSpan}`,
  };
}
