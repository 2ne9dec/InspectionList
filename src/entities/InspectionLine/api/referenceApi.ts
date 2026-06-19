import { rtkApi } from '@/shared/api/rtkApi';
import type { Filial, Voltage, Line, Element, DefectType, Phase } from '../model/types';

// Справочники зашиты прямо в сборку — сервер не нужен
import filialsData          from '../../../../json-server/seed/filials.json';
import voltagesData         from '../../../../json-server/seed/voltages.json';
import linesData            from '../../../../json-server/seed/lines.json';
import elementsData         from '../../../../json-server/seed/elements.json';
import defectTypesData      from '../../../../json-server/seed/defectTypes.json';
import phasesData           from '../../../../json-server/seed/phases.json';
import phaseElementIdsData  from '../../../../json-server/seed/phaseElementIds.json';
import garlandElementIdsData from '../../../../json-server/seed/garlandElementIds.json';
import voltageGarlandCountData from '../../../../json-server/seed/voltageGarlandCount.json';
import filialVoltageFilterData from '../../../../json-server/seed/filialVoltageFilter.json';

const referenceApi = rtkApi.injectEndpoints({
  endpoints: (build) => ({
    getFilials: build.query<Filial[], void>({
      queryFn: () => ({ data: filialsData as Filial[] }),
      providesTags: ['References'],
      // Данные статические (из JSON-бандла) — кешировать бессрочно
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
    getFilialVoltageFilter: build.query<Record<string, number[]>, void>({
      queryFn: () => ({ data: filialVoltageFilterData as Record<string, number[]> }),
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
    updateLine: build.mutation<Line, { id: number; yearBuilt?: number | null; yearLastOverhaul?: number | null; poleType?: string | null; wireType?: string | null; notes?: string | null }>({
      // В офлайн-режиме обновление линий не поддерживается
      queryFn: () => ({ error: { status: 'CUSTOM_ERROR', error: 'Offline mode: line editing not supported' } }),
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
