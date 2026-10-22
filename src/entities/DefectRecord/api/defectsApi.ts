import { rtkApi } from '@/shared/api/rtkApi';
import type { DefectRecord, DefectCount, CreateDefectParams, FixDefectParams } from '../model/types';

const DEFECT_COUNT_TAG = { type: 'DefectCount' as const, id: 'LIST' };

const defectsApi = rtkApi.injectEndpoints({
  endpoints: (build) => ({

    getDefectCounts: build.query<DefectCount[], void>({
      query: () => '/defectCounts',
      providesTags: [DEFECT_COUNT_TAG],
    }),

    getAllDefects: build.query<DefectRecord[], void>({
      query: () => '/defectRecords',
      providesTags: (result) =>
        result
          ? [...result.map(({ id }) => ({ type: 'Defect' as const, id })), { type: 'Defect', id: 'LIST' }]
          : [{ type: 'Defect', id: 'LIST' }],
    }),

    getDefectsBySheet: build.query<DefectRecord[], number>({
      query: (sheetId) => `/defectRecords?sheetId=${sheetId}`,
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
      query: (body) => ({
        url: '/defectRecords',
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _err, { sheetId }) => [
        { type: 'Defect', id: `SHEET_${sheetId}` },
        { type: 'Defect', id: 'LIST' },
        { type: 'Sheet', id: sheetId },
        DEFECT_COUNT_TAG,
      ],
    }),

    fixDefect: build.mutation<DefectRecord, FixDefectParams>({
      query: ({ id, ...patch }) => ({
        url: `/defectRecords/${id}`,
        method: 'PATCH',
        body: patch,
      }),
      invalidatesTags: (_result, _err, { id }) => [
        { type: 'Defect', id },
        { type: 'Defect', id: 'LIST' },
        DEFECT_COUNT_TAG,
      ],
    }),

    deleteDefect: build.mutation<void, number>({
      query: (id) => ({
        url: `/defectRecords/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _err, id) => [
        { type: 'Defect', id },
        { type: 'Defect', id: 'LIST' },
        DEFECT_COUNT_TAG,
      ],
    }),

    patchDefectNotes: build.mutation<DefectRecord, { id: number; notes: string }>({
      query: ({ id, notes }) => ({
        url: `/defectRecords/${id}`,
        method: 'PATCH',
        body: { notes },
      }),
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
          ...(status === 'fixed'
            ? { dateFixed: new Date().toISOString().slice(0, 10), inspectorFix: inspector ?? '' }
            : {}),
        },
      }),
      invalidatesTags: (_result, _err, { id }) => [
        { type: 'Defect', id },
        { type: 'Defect', id: 'LIST' },
        DEFECT_COUNT_TAG,
      ],
    }),

    patchDefectMaster: build.mutation<DefectRecord, {
      id: number;
      masterConclusion?: string | null;
      resolutionDeadline?: string | null;
      masterName?: string | null;
      dateFixed?: string | null;
      fixWorkVolume?: string | null;
      inspectorFix?: string | null;
    }>({
      query: ({ id, dateFixed, inspectorFix, ...rest }) => ({
        url: `/defectRecords/${id}`,
        method: 'PATCH',
        body: {
          ...rest,
          ...(dateFixed ? { dateFixed, inspectorFix: inspectorFix ?? null, isFixed: true } : {}),
        },
      }),
      invalidatesTags: (_result, _err, { id }) => [
        { type: 'Defect' as const, id },
        { type: 'Defect' as const, id: 'LIST' },
        DEFECT_COUNT_TAG,
      ],
    }),

    patchDefectBasic: build.mutation<DefectRecord, { id: number; inspectorFind: string }>({
      query: ({ id, inspectorFind }) => ({
        url: `/defectRecords/${id}`,
        method: 'PATCH',
        body: { inspectorFind },
      }),
      invalidatesTags: (_result, _err, { id }) => [
        { type: 'Defect' as const, id },
        { type: 'Defect' as const, id: 'LIST' },
      ],
    }),

    deleteDefectsBySheet: build.mutation<void, number>({
      query: (sheetId) => ({
        url: `/defectRecordsBySheet/${sheetId}`,
        method: 'DELETE',
      }),
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
  usePatchDefectMasterMutation,
  usePatchDefectBasicMutation,
  useDeleteDefectsBySheetMutation,
} = defectsApi;
