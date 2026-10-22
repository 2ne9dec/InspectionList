import { rtkApi } from '@/shared/api/rtkApi';
import type { InspectionSheet } from '../model/types';

export interface CreateSheetParams {
  filialId: number;
  voltageId: number;
  lineId: number;
  createdDate: string;
  createdBy: string;
}

const sheetsApi = rtkApi.injectEndpoints({
  endpoints: (build) => ({

    getSheets: build.query<InspectionSheet[], { dateFrom?: string; dateTo?: string }>({
      query: ({ dateFrom, dateTo } = {}) => {
        const p = new URLSearchParams();
        if (dateFrom) p.set('dateFrom', dateFrom);
        if (dateTo)   p.set('dateTo',   dateTo);
        const qs = p.toString();
        return qs ? `/inspectionSheets?${qs}` : '/inspectionSheets';
      },
      providesTags: (result) =>
        result
          ? [...result.map(({ id }) => ({ type: 'Sheet' as const, id })), { type: 'Sheet', id: 'LIST' }]
          : [{ type: 'Sheet', id: 'LIST' }],
    }),

    getSheetById: build.query<InspectionSheet, number>({
      query: (id) => `/inspectionSheets/${id}`,
      providesTags: (_result, _err, id) => [{ type: 'Sheet', id }],
    }),

    createSheet: build.mutation<InspectionSheet, CreateSheetParams>({
      query: (body) => ({
        url: '/inspectionSheets',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Sheet', id: 'LIST' }],
    }),

    updateSheet: build.mutation<InspectionSheet, { id: number; createdDate?: string; createdBy?: string; status?: string; notes?: string }>({
      query: ({ id, ...patch }) => ({
        url: `/inspectionSheets/${id}`,
        method: 'PATCH',
        body: patch,
      }),
      invalidatesTags: (_result, _err, { id }) => [
        { type: 'Sheet' as const, id },
        { type: 'Sheet' as const, id: 'LIST' },
      ],
    }),

    cloneSheet: build.mutation<InspectionSheet, { id: number; newDate: string; createdBy?: string }>({
      query: ({ id, newDate, createdBy }) => ({
        url: `/inspectionSheets/${id}/clone`,
        method: 'POST',
        body: { newDate, createdBy },
      }),
      invalidatesTags: [{ type: 'Sheet', id: 'LIST' }],
    }),

    archiveSheet: build.mutation<InspectionSheet, number>({
      query: (id) => ({
        url: `/inspectionSheets/${id}`,
        method: 'PATCH',
        body: { status: 'archived' },
      }),
      invalidatesTags: (_result, _err, id) => [
        { type: 'Sheet', id },
        { type: 'Sheet', id: 'LIST' },
      ],
    }),

    mergeSheets: build.mutation<InspectionSheet, { ids: number[]; createdDate: string; createdBy: string }>({
      query: (body) => ({
        url: '/inspectionSheets/merge',
        method: 'POST',
        body,
      }),
      invalidatesTags: [
        { type: 'Sheet', id: 'LIST' },
        { type: 'Defect', id: 'LIST' },
        { type: 'DefectCount', id: 'LIST' },
      ],
    }),

    deleteSheet: build.mutation<void, number>({
      query: (id) => ({
        url: `/inspectionSheets/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _err, id) => [
        { type: 'Sheet', id },
        { type: 'Sheet', id: 'LIST' },
        { type: 'Defect', id: 'LIST' },
        { type: 'DefectCount', id: 'LIST' },
      ],
    }),

  }),
  overrideExisting: false,
});

export const {
  useGetSheetsQuery,
  useGetSheetByIdQuery,
  useCreateSheetMutation,
  useUpdateSheetMutation,
  useCloneSheetMutation,
  useArchiveSheetMutation,
  useMergeSheetsMutation,
  useDeleteSheetMutation,
} = sheetsApi;
