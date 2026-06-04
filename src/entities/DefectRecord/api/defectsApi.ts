import { rtkApi } from '@/shared/api/rtkApi';
import { localDb } from '@/shared/lib/db/localDb';
import type { DefectRecord, DefectCount, CreateDefectParams, FixDefectParams } from '../model/types';

const DEFECT_COUNT_TAG = { type: 'DefectCount' as const, id: 'LIST' };

const NO_DEFECT_ID = 117; // «Дефекты отсутствуют»

const defectsApi = rtkApi.injectEndpoints({
  endpoints: (build) => ({
    getDefectCounts: build.query<DefectCount[], void>({
      queryFn: async () => {
        const all = await localDb.defectRecords.toArray();
        const map = new Map<number, DefectCount>();
        for (const r of all) {
          if (r.defectId === NO_DEFECT_ID) continue;
          const cur = map.get(r.sheetId) ?? { sheetId: r.sheetId, active: 0, fixed: 0 };
          if (r.isFixed) cur.fixed += 1; else cur.active += 1;
          map.set(r.sheetId, cur);
        }
        return { data: Array.from(map.values()) };
      },
      providesTags: [DEFECT_COUNT_TAG],
    }),

    getAllDefects: build.query<DefectRecord[], void>({
      queryFn: async () => {
        const data = await localDb.defectRecords.toArray();
        return { data };
      },
      providesTags: (result) =>
        result
          ? [...result.map(({ id }) => ({ type: 'Defect' as const, id })), { type: 'Defect', id: 'LIST' }]
          : [{ type: 'Defect', id: 'LIST' }],
    }),

    getDefectsBySheet: build.query<DefectRecord[], number>({
      queryFn: async (sheetId) => {
        const data = await localDb.defectRecords
          .where('sheetId').equals(sheetId)
          .toArray();
        data.sort((a, b) => (a.poleNumber ?? Infinity) - (b.poleNumber ?? Infinity));
        return { data };
      },
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
      queryFn: async (body) => {
        // Дедупликация
        const existing = await localDb.defectRecords.where('sheetId').equals(Number(body.sheetId)).toArray();
        const duplicate = existing.find(
          (r) =>
            (r.poleNumber ?? null) === (body.poleNumber != null ? Number(body.poleNumber) : null) &&
            (r.spanRange ?? null) === (body.spanRange ?? null) &&
            r.defectId === Number(body.defectId) &&
            (r.phaseId ?? null) === (body.phaseId ?? null) &&
            (r.insulatorCount ?? null) === (body.insulatorCount ?? null) &&
            (r.garlandNumber ?? null) === (body.garlandNumber ?? null) &&
            !r.isFixed &&
            (r as any).status !== 'rejected',
        );
        if (duplicate) {
          return { error: { status: 409, error: 'duplicate', data: duplicate } };
        }

        const id = await localDb.defectRecords.add(body as DefectRecord);
        const created = await localDb.defectRecords.get(id as number);
        return { data: created! };
      },
      invalidatesTags: (_result, _err, { sheetId }) => [
        { type: 'Defect', id: `SHEET_${sheetId}` },
        { type: 'Defect', id: 'LIST' },
        { type: 'Sheet', id: sheetId },
        DEFECT_COUNT_TAG,
      ],
    }),

    fixDefect: build.mutation<DefectRecord, FixDefectParams>({
      queryFn: async ({ id, ...patch }) => {
        await localDb.defectRecords.update(id, patch);
        const updated = await localDb.defectRecords.get(id);
        return { data: updated! };
      },
      invalidatesTags: (_result, _err, { id }) => [
        { type: 'Defect', id },
        { type: 'Defect', id: 'LIST' },
        DEFECT_COUNT_TAG,
      ],
    }),

    deleteDefect: build.mutation<void, number>({
      queryFn: async (id) => {
        await localDb.defectRecords.delete(id);
        return { data: undefined };
      },
      invalidatesTags: (_result, _err, id) => [
        { type: 'Defect', id },
        { type: 'Defect', id: 'LIST' },
        DEFECT_COUNT_TAG,
      ],
    }),

    patchDefectNotes: build.mutation<DefectRecord, { id: number; notes: string }>({
      queryFn: async ({ id, notes }) => {
        await localDb.defectRecords.update(id, { notes });
        const updated = await localDb.defectRecords.get(id);
        return { data: updated! };
      },
      invalidatesTags: (_result, _err, { id }) => [
        { type: 'Defect', id },
        { type: 'Defect', id: 'LIST' },
      ],
    }),

    patchDefectStatus: build.mutation<
      { id: number; status: string; isFixed: boolean },
      { id: number; status: 'active' | 'approved' | 'in_progress' | 'rejected' | 'fixed'; inspector?: string }
    >({
      queryFn: async ({ id, status, inspector }) => {
        const patch: Partial<DefectRecord> = {
          isFixed: status === 'fixed',
          ...(status === 'fixed' ? { dateFixed: new Date().toISOString(), inspectorFix: inspector ?? '' } : {}),
        } as any;
        (patch as any).status = status;
        await localDb.defectRecords.update(id, patch);
        const updated = await localDb.defectRecords.get(id);
        return { data: updated as any };
      },
      invalidatesTags: (_result, _err, { id }) => [
        { type: 'Defect', id },
        { type: 'Defect', id: 'LIST' },
        DEFECT_COUNT_TAG,
      ],
    }),

    deleteDefectsBySheet: build.mutation<void, number>({
      queryFn: async (sheetId) => {
        await localDb.defectRecords.where('sheetId').equals(sheetId).delete();
        return { data: undefined };
      },
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
