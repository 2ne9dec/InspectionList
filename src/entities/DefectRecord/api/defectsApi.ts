import { rtkApi } from '@/shared/api/rtkApi';
import type { DefectRecord, DefectCount, CreateDefectParams, FixDefectParams } from '../model/types';

const DEFECT_COUNT_TAG = { type: 'DefectCount' as const, id: 'LIST' };

const defectsApi = rtkApi.injectEndpoints({
  endpoints: (build) => ({
    /**
     * Агрегированные счётчики дефектов по листкам.
     * Возвращает [{sheetId, active, fixed}] — один объект на листок
     * вместо всех записей дефектов. Используется в SheetsList для отображения Активных/Исправленных.
     */
    getDefectCounts: build.query<DefectCount[], void>({
      query: () => '/defectCounts',
      providesTags: [DEFECT_COUNT_TAG],
    }),

    /**
     * Все дефекты по всем листкам — используется только в GlobalDefectSearch
     * (полнотекстовый поиск), который показывается только при наличии поискового запроса.
     */
    getAllDefects: build.query<DefectRecord[], void>({
      query: () => '/defectRecords',
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Defect' as const, id })),
              { type: 'Defect', id: 'LIST' },
            ]
          : [{ type: 'Defect', id: 'LIST' }],
    }),

    getDefectsBySheet: build.query<DefectRecord[], number>({
      query: (sheetId) => `/defectRecords?sheetId=${sheetId}&_sort=poleNumber&_order=asc`,
      providesTags: (result, _err, sheetId) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Defect' as const, id })),
              { type: 'Defect', id: `SHEET_${sheetId}` },
              { type: 'Defect', id: 'LIST' },
            ]
          : [{ type: 'Defect', id: 'LIST' }],
    }),

    createDefect: build.mutation<DefectRecord, CreateDefectParams>({
      query: (body) => ({ url: '/defectRecords', method: 'POST', body }),
      invalidatesTags: (_result, _err, { sheetId }) => [
        { type: 'Defect', id: `SHEET_${sheetId}` },
        { type: 'Defect', id: 'LIST' },
        { type: 'Sheet', id: sheetId },
        DEFECT_COUNT_TAG,
      ],
    }),

    fixDefect: build.mutation<DefectRecord, FixDefectParams>({
      query: ({ id, ...body }) => ({ url: `/defectRecords/${id}`, method: 'PATCH', body }),
      invalidatesTags: (_result, _err, { id }) => [
        { type: 'Defect', id },
        { type: 'Defect', id: 'LIST' },
        DEFECT_COUNT_TAG,
      ],
    }),

    deleteDefect: build.mutation<void, number>({
      query: (id) => ({ url: `/defectRecords/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _err, id) => [
        { type: 'Defect', id },
        { type: 'Defect', id: 'LIST' },
        DEFECT_COUNT_TAG,
      ],
    }),

    patchDefectNotes: build.mutation<DefectRecord, { id: number; notes: string }>({
      query: ({ id, notes }) => ({ url: `/defectRecords/${id}`, method: 'PATCH', body: { notes } }),
      invalidatesTags: (_result, _err, { id }) => [
        { type: 'Defect', id },
        { type: 'Defect', id: 'LIST' },
      ],
    }),


    patchDefectStatus: build.mutation<
      { id: number; status: string; isFixed: boolean },
      { id: number; status: 'active' | 'approved' | 'in_progress' | 'rejected' | 'fixed'; inspector?: string }
    >({
      query: ({ id, status, inspector }) => ({
        url: `/defectRecords/${id}`,
        method: 'PATCH',
        body: {
          status,
          isFixed: status === 'fixed',
          dateFixed: status === 'fixed' ? new Date().toISOString() : undefined,
          inspectorFix: status === 'fixed' ? (inspector ?? '') : undefined,
        },
      }),
      invalidatesTags: (_result, _err, { id }) => [
        { type: 'Defect', id },
        { type: 'Defect', id: 'LIST' },
        DEFECT_COUNT_TAG,
        // PoleCard re-fetch is triggered via 'PoleCoordinate' tag invalidation
        // by wrapping the tag in the component with a custom poleCardTag
      ],
    }),

    deleteDefectsBySheet: build.mutation<void, number>({
      query: (sheetId) => ({ url: `/defectRecordsBySheet/${sheetId}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Defect', id: 'LIST' }, DEFECT_COUNT_TAG],
    }),
  }),
});

export const {
  useGetDefectCountsQuery,
  useGetAllDefectsQuery,
  useGetDefectsBySheetQuery,
  useCreateDefectMutation,
  useFixDefectMutation,
  useDeleteDefectMutation,
  usePatchDefectNotesMutation,
  usePatchDefectStatusMutation,
  useDeleteDefectsBySheetMutation,
} = defectsApi;
