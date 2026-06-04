import { rtkApi } from '@/shared/api/rtkApi';
import type { Filial, Voltage, Line, Element, DefectType, Phase } from '../model/types';

const referenceApi = rtkApi.injectEndpoints({
  endpoints: (build) => ({
    getFilials: build.query<Filial[], void>({
      query: () => '/filials',
      providesTags: ['References'],
    }),
    getVoltages: build.query<Voltage[], void>({
      query: () => '/voltages',
      providesTags: ['References'],
    }),
    getLines: build.query<Line[], void>({
      query: () => '/lines',
      providesTags: ['References'],
    }),
    getElements: build.query<Element[], void>({
      query: () => '/elements',
      providesTags: ['References'],
    }),
    getDefectTypes: build.query<DefectType[], void>({
      query: () => '/defectTypes',
      providesTags: ['References'],
    }),
    // Фильтр напряжений по филиалу (для Жлобина — только ВЛ-35, ВЛ-110, ВЛ-330)
    getFilialVoltageFilter: build.query<Record<string, number[]>, void>({
      query: () => '/filialVoltageFilter',
      providesTags: ['References'],
    }),
    // Список фаз/грозотросов для выбора
    getPhases: build.query<Phase[], void>({
      query: () => '/phases',
      providesTags: ['References'],
    }),
    // Массив element_id у которых нужен выбор фазы
    getPhaseElementIds: build.query<number[], void>({
      query: () => '/phaseElementIds',
      providesTags: ['References'],
    }),
    // Массив element_id у которых нужен выбор номера гирлянды
    getGarlandElementIds: build.query<number[], void>({
      query: () => '/garlandElementIds',
      providesTags: ['References'],
    }),
    // Маппинг voltageId → макс. кол-во гирлянд
    getVoltageGarlandCount: build.query<Record<string, number>, void>({
      query: () => '/voltageGarlandCount',
      providesTags: ['References'],
    }),
    updateLine: build.mutation<Line, { id: number; year_built?: number | null; year_last_overhaul?: number | null; pole_type?: string | null; wire_type?: string | null; notes?: string | null }>({
      query: ({ id, ...body }) => ({ url: '/lines/' + id, method: 'PATCH', body }),
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
