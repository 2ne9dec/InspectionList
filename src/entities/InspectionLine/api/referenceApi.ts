import { rtkApi } from '@/shared/api/rtkApi';
import { localDb } from '@/shared/lib/db/localDb';
import { pb } from '@/shared/lib/pocketbase/pbClient';
import { syncService } from '@/shared/lib/sync/syncService';
import type { Filial, Voltage, Line, Element, DefectType, Phase } from '../model/types';

// JSON-файлы остаются как последний fallback (офлайн + PocketBase ещё не настроен)
import filialsData             from '../../../../json-server/seed/filials.json';
import voltagesData            from '../../../../json-server/seed/voltages.json';
import linesData               from '../../../../json-server/seed/lines.json';
import elementsData            from '../../../../json-server/seed/elements.json';
import defectTypesData         from '../../../../json-server/seed/defectTypes.json';
import phasesData              from '../../../../json-server/seed/phases.json';
import phaseElementIdsData     from '../../../../json-server/seed/phaseElementIds.json';
import garlandElementIdsData   from '../../../../json-server/seed/garlandElementIds.json';
import voltageGarlandCountData from '../../../../json-server/seed/voltageGarlandCount.json';
import filialVoltageFilterData from '../../../../json-server/seed/filialVoltageFilter.json';

/**
 * Справочники статичные — живут в JSON-файлах.
 * Dexie-кеш используется для быстрого повторного доступа.
 * PocketBase для справочников не нужен — только sheets и defect_records.
 */
async function getCachedReference<T>(
  key: string,
  _pbCollection: string,
  fallback: T[],
): Promise<T[]> {
  const cached = await localDb.referenceCache.get(key);
  if (cached) return cached.data as T[];
  // Кладём JSON-данные в Dexie при первом запуске
  await localDb.referenceCache.put({ key, data: fallback, fetchedAt: new Date().toISOString() });
  return fallback;
}

const referenceApi = rtkApi.injectEndpoints({
  endpoints: (build) => ({
    getFilials: build.query<Filial[], void>({
      queryFn: async () => ({ data: await getCachedReference('filials', '', filialsData as Filial[]) }),
      providesTags: ['References'],
      keepUnusedDataFor: Infinity,
    }),
    getVoltages: build.query<Voltage[], void>({
      queryFn: async () => ({ data: await getCachedReference('voltages', '', voltagesData as Voltage[]) }),
      providesTags: ['References'],
      keepUnusedDataFor: Infinity,
    }),
    getLines: build.query<Line[], void>({
      queryFn: async () => ({ data: await getCachedReference('lines', '', linesData as Line[]) }),
      providesTags: ['References'],
      keepUnusedDataFor: Infinity,
    }),
    getElements: build.query<Element[], void>({
      queryFn: async () => {
        // Миграция v2: сбрасываем старый кеш 'елементс' (Шунт-грозотроса → Шунт)
        await localDb.referenceCache.delete('elements');
        return { data: await getCachedReference('elements_v2', '', elementsData as Element[]) };
      },
      providesTags: ['References'],
      keepUnusedDataFor: Infinity,
    }),
    getDefectTypes: build.query<DefectType[], void>({
      queryFn: async () => ({ data: await getCachedReference('defect_types', '', defectTypesData as DefectType[]) }),
      providesTags: ['References'],
      keepUnusedDataFor: Infinity,
    }),
    getFilialVoltageFilter: build.query<Record<string, number[]>, void>({
      queryFn: () => ({ data: filialVoltageFilterData as Record<string, number[]> }),
      providesTags: ['References'],
      keepUnusedDataFor: Infinity,
    }),
    getPhases: build.query<Phase[], void>({
      queryFn: async () => {
        // Миграция v2: удаляем старый ключ ‘phases’, используем ‘phases_v2’
        // Гарантирует что все пользователи получат Фаза A/B/C
        await localDb.referenceCache.delete('phases');
        return { data: await getCachedReference('phases_v2', '', phasesData as Phase[]) };
      },
      providesTags: ['References'],
      keepUnusedDataFor: Infinity,
    }),
    // Конфигурационные данные — остаются из JSON (меняются редко, только с релизом)
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
    updateLine: build.mutation<Line, {
      id: number;
      yearBuilt?: number | null;
      yearLastOverhaul?: number | null;
      poleType?: string | null;
      wireType?: string | null;
      notes?: string | null;
    }>({
      queryFn: async ({ id, ...patch }) => {
        // Обновляем кеш в Dexie
        const cached = await localDb.referenceCache.get('lines');
        if (cached) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          cached.data = cached.data.map((l: any) => (l.id === id ? { ...l, ...patch } : l));
          await localDb.referenceCache.put(cached);
        }
        // Пытаемся отправить на PocketBase
        try {
          const existing = await pb.collection('lines').getFirstListItem(`num_id=${id}`);
          await pb.collection('lines').update(existing.id, patch);
        } catch {
          // Офлайн — поставим в очередь как update через enqueueSyncTask не можем
          // (lines не в syncQueue), просто запланируем pull при следующей синхронизации
          syncService.scheduleSync(5000);
        }
        const updated = cached?.data.find((l: any) => l.id === id) ?? { id, ...patch };
        return { data: updated as Line };
      },
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
