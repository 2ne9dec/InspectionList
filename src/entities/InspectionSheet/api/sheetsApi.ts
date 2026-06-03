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
    getSheets: build.query<InspectionSheet[], void>({
      query: () => '/inspectionSheets?_sort=createdDate&_order=desc',
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
        body: { ...body, status: 'active' },
      }),
      invalidatesTags: [{ type: 'Sheet', id: 'LIST' }],
    }),

    cloneSheet: build.mutation<InspectionSheet, { id: number; newDate: string }>({
      query: ({ id, newDate }) => ({
        url: `/inspectionSheets/${id}/clone`,
        method: 'POST',
        body: { newDate },
      }),
      invalidatesTags: [{ type: 'Sheet', id: 'LIST' }],
    }),

    deleteSheet: build.mutation<void, number>({
      query: (id) => ({
        url: `/inspectionSheets/${id}`,
        method: 'DELETE',
      }),
      // Также удаляем все связанные дефекты — делается через каскадный вызов в feature
      invalidatesTags: (_result, _err, id) => [
        { type: 'Sheet', id },
        { type: 'Sheet', id: 'LIST' },
        { type: 'Defect', id: 'LIST' },
      ],
    }),
  }),
});

export const { useGetSheetsQuery, useGetSheetByIdQuery, useCreateSheetMutation, useCloneSheetMutation, useDeleteSheetMutation } = sheetsApi;
