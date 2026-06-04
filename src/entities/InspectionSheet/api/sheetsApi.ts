import { rtkApi } from '@/shared/api/rtkApi';
import { localDb } from '@/shared/lib/db/localDb';
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
      queryFn: async () => {
        const sheets = await localDb.sheets.orderBy('createdDate').reverse().toArray();
        return { data: sheets };
      },
      providesTags: (result) =>
        result
          ? [...result.map(({ id }) => ({ type: 'Sheet' as const, id })), { type: 'Sheet', id: 'LIST' }]
          : [{ type: 'Sheet', id: 'LIST' }],
    }),

    getSheetById: build.query<InspectionSheet, number>({
      queryFn: async (id) => {
        const sheet = await localDb.sheets.get(id);
        if (!sheet) return { error: { status: 'CUSTOM_ERROR' as const, error: 'Not found' } };
        return { data: sheet };
      },
      providesTags: (_result, _err, id) => [{ type: 'Sheet', id }],
    }),

    createSheet: build.mutation<InspectionSheet, CreateSheetParams>({
      queryFn: async (body) => {
        try {
          const record = {
            filialId:    body.filialId,
            voltageId:   body.voltageId,
            lineId:      body.lineId,
            createdDate: body.createdDate,
            createdBy:   body.createdBy,
            status:      'active' as const,
          };
          const id = await localDb.sheets.add(record as InspectionSheet);
          const created = await localDb.sheets.get(id as number);
          return { data: created! };
        } catch (e: any) {
          return { error: { status: 'CUSTOM_ERROR' as const, error: String(e?.message ?? e) } };
        }
      },
      invalidatesTags: [{ type: 'Sheet', id: 'LIST' }],
    }),

    cloneSheet: build.mutation<InspectionSheet, { id: number; newDate: string }>({
      queryFn: async ({ id, newDate }) => {
        const original = await localDb.sheets.get(id);
        if (!original) return { error: { status: 'CUSTOM_ERROR' as const, error: 'Not found' } };
        const { id: _omit, ...rest } = original;
        const newId = await localDb.sheets.add({ ...rest, createdDate: newDate, status: 'active' } as InspectionSheet);

        // Клонируем дефекты
        const defects = await localDb.defectRecords.where('sheetId').equals(id).toArray();
        for (const d of defects) {
          const { id: _did, ...dRest } = d;
          await localDb.defectRecords.add({ ...dRest, sheetId: newId as number } as any);
        }

        const cloned = await localDb.sheets.get(newId as number);
        return { data: cloned! };
      },
      invalidatesTags: [{ type: 'Sheet', id: 'LIST' }],
    }),

    deleteSheet: build.mutation<void, number>({
      queryFn: async (id) => {
        await localDb.defectRecords.where('sheetId').equals(id).delete();
        await localDb.sheets.delete(id);
        return { data: undefined };
      },
      invalidatesTags: (_result, _err, id) => [
        { type: 'Sheet', id },
        { type: 'Sheet', id: 'LIST' },
        { type: 'Defect', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useGetSheetsQuery,
  useGetSheetByIdQuery,
  useCreateSheetMutation,
  useCloneSheetMutation,
  useDeleteSheetMutation,
} = sheetsApi;
