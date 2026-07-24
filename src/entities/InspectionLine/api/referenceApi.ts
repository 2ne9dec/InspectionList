import { rtkApi } from '@/shared/api/rtkApi';
import { localDb } from '@/shared/lib/db/localDb';
import { getApiUrl } from '@/shared/lib/api/apiUrl';
import { STORAGE_KEYS } from '@/shared/const/storageKeys';
import type { Filial, Voltage, Line, Element, DefectType, Phase } from '../model/types';

import filialsData             from '../../../../server/seed/filials.json';
import voltagesData            from '../../../../server/seed/voltages.json';
import linesData               from '../../../../server/seed/lines.json';
import elementsData            from '../../../../server/seed/elements.json';
import defectTypesData         from '../../../../server/seed/defectTypes.json';
import phasesData              from '../../../../server/seed/phases.json';
import phaseElementIdsData     from '../../../../server/seed/phaseElementIds.json';
import garlandElementIdsData   from '../../../../server/seed/garlandElementIds.json';
import voltageGarlandCountData from '../../../../server/seed/voltageGarlandCount.json';
import filialVoltageFilterData from '../../../../server/seed/filialVoltageFilter.json';

async function getCachedReference<T>(key: string, fallback: T[]): Promise<T[]> {
  const cached = await localDb.referenceCache.get(key);
  if (cached) return cached.data as T[];
  await localDb.referenceCache.put({ key, data: fallback, fetchedAt: new Date().toISOString() });
  return fallback;
}

const referenceApi = rtkApi.injectEndpoints({
  endpoints: (build) => ({
    getFilials: build.query<Filial[], void>({
      queryFn: async () => ({ data: await getCachedReference('filials', filialsData as Filial[]) }),
      providesTags: ['References'],
      keepUnusedDataFor: Infinity,
    }),
    getVoltages: build.query<Voltage[], void>({
      queryFn: async () => ({ data: await getCachedReference('voltages', voltagesData as Voltage[]) }),
      providesTags: ['References'],
      keepUnusedDataFor: Infinity,
    }),
    getLines: build.query<Line[], void>({
      queryFn: async () => ({ data: await getCachedReference('lines', linesData as Line[]) }),
      providesTags: ['References'],
      keepUnusedDataFor: Infinity,
    }),
    getElements: build.query<Element[], void>({
      queryFn: async () => {
        await localDb.referenceCache.delete('elements');
        return { data: await getCachedReference('elements_v2', elementsData as Element[]) };
      },
      providesTags: ['References'],
      keepUnusedDataFor: Infinity,
    }),
    getDefectTypes: build.query<DefectType[], void>({
      queryFn: async () => ({ data: await getCachedReference('defect_types', defectTypesData as DefectType[]) }),
      providesTags: ['References'],
      keepUnusedDataFor: Infinity,
    }),
    getFilialVoltageFilter: build.query<Record<string, number[]>, void>({
      queryFn: () => ({ data: filialVoltageFilterData as Record<string, number[]> }),
      providesTags: ['References'],
      keepUnusedDataFor: Infinity,
    }),
    getPhases: build.query<Phase[], void>({
      queryFn: async () => {
        await localDb.referenceCache.delete('phases');
        return { data: await getCachedReference('phases_v2', phasesData as Phase[]) };
      },
      providesTags: ['References'],
      keepUnusedDataFor: Infinity,
    }),
    getPhaseElementIds: build.query<number[], void>({
      queryFn: () => ({ data: phaseElementIdsData as number[] }),
      providesTags: ['References'],
      keepUnusedDataFor: Infinity,
    }),
    getGarlandElementIds: build.query<number[], void>({
      queryFn: () => ({ data: garlandElementIdsData as number[] }),
      providesTags: ['References'],
      keepUnusedDataFor: Infinity,
    }),
    getVoltageGarlandCount: build.query<Record<string, number>, void>({
      queryFn: () => ({ data: voltageGarlandCountData as Record<string, number> }),
      providesTags: ['References'],
      keepUnusedDataFor: Infinity,
    }),
    updateLine: build.mutation<Line, {
      id: number;
      yearBuilt?: number | null;
      yearLastOverhaul?: number | null;
      poleType?: string | null;
      wireType?: string | null;
      notes?: string | null;
    }>({
      queryFn: async ({ id, ...patch }) => {
        const cached = await localDb.referenceCache.get('lines');
        if (cached) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          cached.data = cached.data.map((l: any) => (l.id === id ? { ...l, ...patch } : l));
          await localDb.referenceCache.put(cached);
        }
        try {
          const token = sessionStorage.getItem(STORAGE_KEYS.TOKEN);
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (token) headers['Authorization'] = `Bearer ${token}`;
          await fetch(`${getApiUrl()}/lines/${id}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify(patch),
          });
        } catch {
          // Офлайн — обновим позже
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updated = cached?.data.find((l: any) => l.id === id) ?? { id, ...patch };
        return { data: updated as Line };
      },
      invalidatesTags: ['References'],
    }),
  }),
});

export const {
  useGetFilialsQuery,
  useGetVoltagesQuery,
  useGetLinesQuery,
  useGetElementsQuery,
  useGetDefectTypesQuery,
  useGetPhasesQuery,
  useGetPhaseElementIdsQuery,
  useGetGarlandElementIdsQuery,
  useGetVoltageGarlandCountQuery,
  useGetFilialVoltageFilterQuery,
  useUpdateLineMutation,
} = referenceApi;
