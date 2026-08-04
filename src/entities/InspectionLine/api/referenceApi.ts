import { rtkApi } from '@/shared/api/rtkApi';
import { localDb } from '@/shared/lib/db/localDb';
import { getApiUrl } from '@/shared/lib/api/apiUrl';
import { STORAGE_KEYS } from '@/shared/const/storageKeys';
import type { Filial, Voltage, Line, Element, DefectType, Phase } from '../model/types';

// Статичные данные — не зависят от филиала, берутся из seed напрямую
import elementsData            from '../../../../server/seed/elements.json';
import defectTypesData         from '../../../../server/seed/defectTypes.json';
import phasesData              from '../../../../server/seed/phases.json';
import phaseElementIdsData     from '../../../../server/seed/phaseElementIds.json';
import garlandElementIdsData   from '../../../../server/seed/garlandElementIds.json';
import voltageGarlandCountData from '../../../../server/seed/voltageGarlandCount.json';

// Fallback-данные на случай полного офлайна
import filialsDataFallback             from '../../../../server/seed/filials.json';
import voltagesDataFallback            from '../../../../server/seed/voltages.json';
import linesDataFallback               from '../../../../server/seed/lines.json';
import filialVoltageFilterDataFallback from '../../../../server/seed/filialVoltageFilter.json';

// Версия кэша: меняй при обновлении структуры данных чтобы сбросить старый кэш
const CACHE_VERSION = 'v3';

// Суффикс кеша для текущего пользователя — gomel и zhlobin не делят один кеш
function getUserCacheSuffix(): string {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEYS.USER);
    if (!raw) return '_u0';
    const u = JSON.parse(raw) as { filialId?: number | null };
    return `_u${u.filialId ?? 'all'}`;
  } catch {
    return '_u0';
  }
}

// Универсальный fetch: cache-first (stale-while-revalidate)
// Возвращает localDb кеш мгновенно, обновляет с сервера в фоне
async function fetchFromServer<T>(
  endpoint: string,
  cacheKey: string,
  fallback: T[],
): Promise<T[]> {
  const versionedKey = `${cacheKey}_${CACHE_VERSION}${getUserCacheSuffix()}`;

  // Сначала читаем localDb (~1 мс)
  const cached = await localDb.referenceCache.get(versionedKey);

  // Фоновое обновление с сервера
  const serverFetch = (async () => {
    const token = sessionStorage.getItem(STORAGE_KEYS.TOKEN);
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${getApiUrl()}/${endpoint}`, { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: T[] = await res.json();
    await localDb.referenceCache.put({ key: versionedKey, data: data as unknown[], fetchedAt: new Date().toISOString() });
    return data;
  })();

  // Кеш или seed — всегда мгновенно; сервер обновляет localDb в фоне
  serverFetch.catch(() => {});
  return cached ? (cached.data as T[]) : fallback;
}

// Для объектов (filialVoltageFilter возвращает Record, не массив)
async function fetchObjectFromServer<T extends object>(
  endpoint: string,
  cacheKey: string,
  fallback: T,
): Promise<T> {
  const versionedKey = `${cacheKey}_${CACHE_VERSION}${getUserCacheSuffix()}`;

  const cached = await localDb.referenceCache.get(versionedKey);

  const serverFetch = (async () => {
    const token = sessionStorage.getItem(STORAGE_KEYS.TOKEN);
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${getApiUrl()}/${endpoint}`, { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: T = await res.json();
    await localDb.referenceCache.put({ key: versionedKey, data: data as unknown as unknown[], fetchedAt: new Date().toISOString() });
    return data;
  })();

  serverFetch.catch(() => {});
  return cached ? (cached.data as unknown as T) : fallback;
}

// Статичный кэш (не меняется после деплоя)
async function getCachedStatic<T>(key: string, fallback: T[]): Promise<T[]> {
  const cached = await localDb.referenceCache.get(key);
  if (cached) return cached.data as T[];
  await localDb.referenceCache.put({ key, data: fallback as unknown[], fetchedAt: new Date().toISOString() });
  return fallback;
}

const referenceApi = rtkApi.injectEndpoints({
  endpoints: (build) => ({

    // Динамические — зависят от филиала, берутся с сервера
    getFilials: build.query<Filial[], void>({
      queryFn: async () => ({
        data: await fetchFromServer<Filial>('filials', 'filials', filialsDataFallback as Filial[]),
      }),
      providesTags: ['References'],
      keepUnusedDataFor: Infinity,
    }),

    getVoltages: build.query<Voltage[], void>({
      queryFn: async () => ({
        data: await fetchFromServer<Voltage>('voltages', 'voltages', voltagesDataFallback as Voltage[]),
      }),
      providesTags: ['References'],
      keepUnusedDataFor: Infinity,
    }),

    getLines: build.query<Line[], void>({
      queryFn: async () => ({
        data: await fetchFromServer<Line>('lines', 'lines', linesDataFallback as unknown as Line[]),
      }),
      providesTags: ['References'],
      keepUnusedDataFor: Infinity,
    }),

    getFilialVoltageFilter: build.query<Record<string, number[]>, void>({
      queryFn: async () => ({
        data: await fetchObjectFromServer<Record<string, number[]>>(
          'filialVoltageFilter',
          'filial_voltage_filter',
          filialVoltageFilterDataFallback as Record<string, number[]>,
        ),
      }),
      providesTags: ['References'],
      keepUnusedDataFor: Infinity,
    }),

    // Статичные — одинаковы для всех пользователей
    getElements: build.query<Element[], void>({
      queryFn: async () => ({
        data: await getCachedStatic('elements_v2', elementsData as Element[]),
      }),
      providesTags: ['References'],
      keepUnusedDataFor: Infinity,
    }),

    getDefectTypes: build.query<DefectType[], void>({
      queryFn: async () => ({
        data: await getCachedStatic('defect_types', defectTypesData as DefectType[]),
      }),
      providesTags: ['References'],
      keepUnusedDataFor: Infinity,
    }),

    getPhases: build.query<Phase[], void>({
      queryFn: async () => ({
        data: await getCachedStatic('phases_v2', phasesData as Phase[]),
      }),
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

    // Обновление линии — пишет на сервер и инвалидирует кэш
    updateLine: build.mutation<Line, {
      id: number;
      yearBuilt?: number | null;
      yearLastOverhaul?: number | null;
      poleType?: string | null;
      wireType?: string | null;
      notes?: string | null;
      poleCount?: number | null;
    }>({
      queryFn: async ({ id, ...patch }) => {
        const versionedKey = `lines_${CACHE_VERSION}${getUserCacheSuffix()}`;
        const cached = await localDb.referenceCache.get(versionedKey);
        if (cached) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          cached.data = (cached.data as any[]).map((l: any) => (l.id === id ? { ...l, ...patch } : l));
          await localDb.referenceCache.put(cached);
        }
        try {
          const token = sessionStorage.getItem(STORAGE_KEYS.TOKEN);
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (token) headers['Authorization'] = `Bearer ${token}`;
          await fetch(`${getApiUrl()}/lines/${id}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify(patch),
          });
        } catch {
          // Офлайн — изменения применены только локально
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updated = (cached?.data as any[])?.find((l: any) => l.id === id) ?? { id, ...patch };
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
