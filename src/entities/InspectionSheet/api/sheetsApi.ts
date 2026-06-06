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
          const id = await localDb.sheets.add({
            filialId:    body.filialId,
            voltageId:   body.voltageId,
            lineId:      body.lineId,
            createdDate: body.createdDate,
            createdBy:   body.createdBy,
            status:      'active',
          } as InspectionSheet);
          const created = await localDb.sheets.get(id as number);
          return { data: created! };
        } catch (e: any) {
          return { error: { status: 'CUSTOM_ERROR' as const, error: String(e?.message ?? e) } };
        }
      },
      invalidatesTags: [{ type: 'Sheet', id: 'LIST' }],
    }),

    // Клонируем только метаданные листка — дефекты НЕ копируются
    cloneSheet: build.mutation<InspectionSheet, { id: number; newDate: string; createdBy?: string }>({
      queryFn: async ({ id, newDate, createdBy }) => {
        const original = await localDb.sheets.get(id);
        if (!original) return { error: { status: 'CUSTOM_ERROR' as const, error: 'Not found' } };
        const newId = await localDb.sheets.add({
          filialId:    original.filialId,
          voltageId:   original.voltageId,
          lineId:      original.lineId,
          createdDate: newDate,
          createdBy:   createdBy ?? original.createdBy,
          status:      'active',
        } as InspectionSheet);
        const cloned = await localDb.sheets.get(newId as number);
        return { data: cloned! };
      },
      invalidatesTags: [{ type: 'Sheet', id: 'LIST' }],
    }),

    archiveSheet: build.mutation<InspectionSheet, number>({
      queryFn: async (id) => {
        await localDb.sheets.update(id, { status: 'archived' });
        const updated = await localDb.sheets.get(id);
        return { data: updated! };
      },
      invalidatesTags: (_result, _err, id) => [
        { type: 'Sheet', id },
        { type: 'Sheet', id: 'LIST' },
      ],
    }),

    // Слияние: копируем дефекты, УДАЛЯЕМ исходные листки
    mergeSheets: build.mutation<InspectionSheet, { ids: number[]; createdDate: string; createdBy: string }>({
      queryFn: async ({ ids, createdDate, createdBy }) => {
        const sheets = await Promise.all(ids.map((id) => localDb.sheets.get(id)));
        const valid = sheets.filter(Boolean) as InspectionSheet[];
        if (!valid.length) return { error: { status: 'CUSTOM_ERROR' as const, error: 'No sheets' } };
        const base = valid[0];
        const newId = await localDb.sheets.add({
          filialId:  base.filialId,
          voltageId: base.voltageId,
          lineId:    base.lineId,
          createdDate,
          createdBy,
          status:    'active',
        } as InspectionSheet);
        for (const id of ids) {
          const defects = await localDb.defectRecords.where('sheetId').equals(id).toArray();
          for (const d of defects) {
            const { id: _did, ...dRest } = d;
            await localDb.defectRecords.add({ ...dRest, sheetId: newId as number } as any);
          }
          // Удаляем исходный листок и его оригинальные дефекты
          await localDb.defectRecords.where('sheetId').equals(id).delete();
          await localDb.sheets.delete(id);
        }
        const merged = await localDb.sheets.get(newId as number);
        return { data: merged! };
      },
      invalidatesTags: [{ type: 'Sheet', id: 'LIST' }, { type: 'Defect', id: 'LIST' }],
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
  useArchiveSheetMutation,
  useMergeSheetsMutation,
  useDeleteSheetMutation,
} = sheetsApi;
