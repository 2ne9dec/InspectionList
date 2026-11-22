import { useCallback, useMemo, useState } from 'react';
import {
  useGetDefectsBySheetQuery,
  useDeleteDefectMutation,
  useDeleteDefect,
  enrichDefects,
  filterDefectRows,
  groupByPole,
} from '@/entities/DefectRecord';
import { useGetDefectTypesQuery, useGetElementsQuery, useGetPhasesQuery } from '@/entities/InspectionLine';
import { toast } from '@/shared/lib/toast';
import { logger } from '@/shared/lib/logger';

export type DefectTab = 'active' | 'fixed';
export type SortDir = 'asc' | 'desc';

/**
 * Бизнес-логика виджета DefectTable:
 *  - данные (RTK Query) + локальное UI-состояние (поиск/фильтры/сортировка/вкладка)
 *  - enrichment + group by pole
 *  - удаление дефекта с confirm
 *
 * Возвращает все вычисленные данные + UI-сеттеры одним плоским объектом.
 */
export function useDefectTable(sheetId: number) {
  const [tab, setTab] = useState<DefectTab>('active');
  const [search, setSearch] = useState('');
  const [filterElementId, setFilterElementId] = useState('');
  const [filterDefectTypeId, setFilterDefectTypeId] = useState('');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const { data: allDefects = [], isLoading } = useGetDefectsBySheetQuery(sheetId);
  const { data: defectTypes = [] } = useGetDefectTypesQuery();
  const { data: elements = [] } = useGetElementsQuery();
  const { data: phases = [] } = useGetPhasesQuery();
  const [deleteDefect] = useDeleteDefectMutation();
  const { handleDelete, confirmProps, confirm } = useDeleteDefect();

  // 1. Обогащаем имена + фильтруем по вкладке
  const enriched = useMemo(
    () =>
      enrichDefects(
        allDefects.filter((d) => !!d.isFixed === (tab === 'fixed')),
        defectTypes,
        elements,
        phases,
      ),
    [allDefects, defectTypes, elements, phases, tab],
  );

  // H-1: предвычисляем Map один раз, чтобы filter был O(n) вместо O(n²)
  const defectElementMap = useMemo(
    () => new Map(defectTypes.map((t) => [t.id, String(t.elementId)])),
    [defectTypes],
  );

  // 2. Применяем фильтры/поиск
  const filtered = useMemo(
    () => filterDefectRows(
      enriched,
      {
        elementId: filterElementId,
        defectTypeId: filterDefectTypeId,
        search,
      },
      defectElementMap,
    ),
    [enriched, filterElementId, filterDefectTypeId, search, defectElementMap],
  );

  // 3. Группируем по опоре
  const groupedByPole = useMemo(() => groupByPole(filtered, sortDir), [filtered, sortDir]);

  // 4. Опции для шапки таблицы
  const elementOptions = useMemo(() => elements.map((e) => ({ id: e.id, name: e.name })), [elements]);

  const defectTypeOptions = useMemo(() => {
    const source = filterElementId ? defectTypes.filter((t) => String(t.elementId) === filterElementId) : defectTypes;
    return source.map((t) => ({ id: t.id, name: t.name }));
  }, [defectTypes, filterElementId]);

  // 5. Счётчики и фильтры для toolbar
  const activeCount = useMemo(() => allDefects.filter((d) => !d.isFixed).length, [allDefects]);
  const fixedCount = useMemo(() => allDefects.filter((d) => d.isFixed).length, [allDefects]);
  const hasFilters = !!(filterElementId || filterDefectTypeId || search);

  // 6. Команды
  const clearFilters = useCallback(() => {
    setFilterElementId('');
    setFilterDefectTypeId('');
    setSearch('');
  }, []);

  const toggleSort = useCallback(() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc')), []);

  // handleDelete — из useDeleteDefect (логика удалена отсюда, живёт в хуке)

  const handleDeleteAll = useCallback(
    async (ids: number[]) => {
      if (ids.length === 0) return;
      const ok = await confirm({
        title: `Удалить дефекты опоры (${ids.length} шт.)?`,
        description: 'Это действие необратимо.',
        variant: 'danger',
      });
      if (!ok) return;
      try {
        await Promise.all(ids.map((id) => deleteDefect(id).unwrap()));
        toast.success(`Удалено дефектов: ${ids.length}`);
      } catch (err) {
        logger.error('Delete all defects failed', err);
        toast.error('Ошибка при удалении дефектов');
      }
    },
    [confirm, deleteDefect],
  );

  const handleElementChange = useCallback((v: string) => {
    setFilterElementId(v);
    setFilterDefectTypeId('');
  }, []);

  return {
    // данные
    isLoading,
    groupedByPole,
    elementOptions,
    defectTypeOptions,
    activeCount,
    fixedCount,
    hasFilters,
    // UI state
    tab,
    setTab,
    search,
    setSearch,
    filterElementId,
    filterDefectTypeId,
    sortDir,
    // команды
    toggleSort,
    clearFilters,
    handleElementChange,
    setFilterDefectTypeId,
    handleDelete,
    handleDeleteAll,
    confirmProps,
  };
}
