import { rtkApi } from '@/shared/api/rtkApi';
import type { Filial, Voltage, Line, Element, DefectType, Phase } from '../model/types';

// Все справочники берутся из локальных reference-файлов (офлайн-first).
// Источник — server/seed; синхронизация: yarn reference:sync.
import filialsData             from '@/shared/config/reference/filials.json';
import voltagesData            from '@/shared/config/reference/voltages.json';
import linesData               from '@/shared/config/reference/lines.json';
import filialVoltageFilterData from '@/shared/config/reference/filialVoltageFilter.json';
import elementsData            from '@/shared/config/reference/elements.json';
import defectTypesData         from '@/shared/config/reference/defectTypes.json';
import phasesData              from '@/shared/config/reference/phases.json';
import phaseElementIdsData     from '@/shared/config/reference/phaseElementIds.json';
import garlandElementIdsData   from '@/shared/config/reference/garlandElementIds.json';
import voltageGarlandCountData from '@/shared/config/reference/voltageGarlandCount.json';

const referenceApi = rtkApi.injectEndpoints({
  endpoints: (build) => ({

    // Справочники — из локальных seed-файлов (работают без сети)
    getFilials: build.query<Filial[], void>({
      queryFn: () => ({ data: filialsData as Filial[] }),
      providesTags: ['References'],
      keepUnusedDataFor: Infinity,
    }),

    getVoltages: build.query<Voltage[], void>({
      queryFn: () => ({ data: voltagesData as Voltage[] }),
      providesTags: ['References'],
      keepUnusedDataFor: Infinity,
    }),

    getLines: build.query<Line[], void>({
      queryFn: () => ({ data: linesData as Line[] }),
      providesTags: ['References'],
      keepUnusedDataFor: Infinity,
    }),

    getFilialVoltageFilter: build.query<Record<string, number[]>, void>({
      queryFn: () => ({ data: filialVoltageFilterData as Record<string, number[]> }),
      providesTags: ['References'],
      keepUnusedDataFor: Infinity,
    }),

    getElements: build.query<Element[], void>({
      queryFn: () => ({ data: elementsData as Element[] }),
      providesTags: ['References'],
      keepUnusedDataFor: Infinity,
    }),

    getDefectTypes: build.query<DefectType[], void>({
      queryFn: () => ({ data: defectTypesData as DefectType[] }),
      providesTags: ['References'],
      keepUnusedDataFor: Infinity,
    }),

    getPhases: build.query<Phase[], void>({
      queryFn: () => ({ data: phasesData as Phase[] }),
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

    // Обновление линии — пишет на сервер
    updateLine: build.mutation<Line, {
      id: number;
      yearBuilt?: number | null;
      yearLastOverhaul?: number | null;
      poleType?: string | null;
      wireType?: string | null;
      notes?: string | null;
      poleCount?: number | null;
    }>({
      query: ({ id, ...patch }) => ({
        url: `/lines/${id}`,
        method: 'PATCH',
        body: patch,
      }),
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
