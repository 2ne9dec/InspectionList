import { rtkApi } from '@/shared/api/rtkApi';
import type { Filial, Voltage, Line, Element, DefectType, Phase } from '../model/types';

// Все справочники берутся из seed-файлов (офлайн-first).
// Изменения структуры (новые линии, SAP-коды) применяются через export-db-to-seed.js
// и деплой новой версии приложения.
import filialsData            from '../../../../server/seed/filials.json';
import voltagesData           from '../../../../server/seed/voltages.json';
import linesData              from '../../../../server/seed/lines.json';
import filialVoltageFilterData from '../../../../server/seed/filialVoltageFilter.json';
import elementsData            from '../../../../server/seed/elements.json';
import defectTypesData         from '../../../../server/seed/defectTypes.json';
import phasesData              from '../../../../server/seed/phases.json';
import phaseElementIdsData     from '../../../../server/seed/phaseElementIds.json';
import garlandElementIdsData   from '../../../../server/seed/garlandElementIds.json';
import voltageGarlandCountData from '../../../../server/seed/voltageGarlandCount.json';

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
