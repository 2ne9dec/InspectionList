import { useCallback, useMemo, useState } from 'react';
import { useGetDefectsBySheetQuery, useDeleteDefectMutation, useDeleteDefect } from '@/entities/DefectRecord';
import { useGetDefectTypesQuery, useGetElementsQuery, useGetPhasesQuery } from '@/entities/InspectionLine';
import type { Severity } from '@/shared/const/severity';
import { SEVERITY_LABELS } from '@/shared/const/severity';
import { enrichDefects, groupByPole } from '../lib/enrichDefects';
import { toast } from '@/shared/lib/toast';
import { logger } from '@/shared/lib/logger';

export type DefectTab = 'active' | 'fixed';
export type SortDir = 'asc' | 'desc';

type SeverityCounts = Record<Severity, number>;

/**
 * Бизнес-логика виджета DefectTable:
 *  - данные (RTK Query) + локальное UI-состояние (поиск/фильтры/сортировка/вкладка)
 *  - enrichment + group by pole + статистика по severity
 *  - удаление дефекта с confirm
 *
 * Возвращает все вычисленные данные + UI-сеттеры одним плоским объектом.
 */
export function useDefectTable(sheetId: number) {
  const [tab, setTab] = useState<DefectTab>('active');
  const [search, setSearch] = useState('');
  const [filterElementId, setFilterElementId] = useState('');
  const [filterDefectTypeId, setFilterDefectTypeId] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');
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
    () => new Map(defectTypes.map((t) => [t.id, String(t.element_id)])),
    [defectTypes],
  );

  // 2. Применяем фильтры/поиск
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enriched.filter((d) => {
      if (filterElementId && defectElementMap.get(d.defectId) !== filterElementId) return false;
      if (filterDefectTypeId && String(d.defectId) !== filterDefectTypeId) return false;
      if (filterSeverity && d.severity !== filterSeverity) return false;
      if (q) {
        return (
          d.defectName.toLowerCase().includes(q) ||
          d.elementName.toLowerCase().includes(q) ||
          String(d.poleNumber).includes(q) ||
          d.inspectorFind.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [enriched, filterElementId, filterDefectTypeId, filterSeverity, search, defectElementMap]);

  // 3. Группируем по опоре
  const groupedByPole = useMemo(() => groupByPole(filtered, sortDir), [filtered, sortDir]);

  // 4. Статистика по severity (только для активной вкладки)
  const severityStats = useMemo<SeverityCounts | null>(() => {
    if (tab !== 'active') return null;
    const counts: SeverityCounts = { critical: 0, high: 0, medium: 0, low: 0, ok: 0 };
    for (const d of enriched) counts[d.severity as Severity]++;
    return counts;
  }, [enriched, tab]);

  // 5. Опции для шапки таблицы
  const elementOptions = useMemo(() => elements.map((e) => ({ id: e.id, name: e.name })), [elements]);

  const defectTypeOptions = useMemo(() => {
    const source = filterElementId ? defectTypes.filter((t) => String(t.element_id) === filterElementId) : defectTypes;
    return source.map((t) => ({ id: t.id, name: t.name }));
  }, [defectTypes, filterElementId]);

  // Опции фильтра по severity. id-ы — строковые ключи Severity ('critical'/'medium'/'low').
  const severityOptions = useMemo(
    () =>
      (Object.keys(SEVERITY_LABELS) as Severity[]).map((s) => ({
        id: s,
        name: SEVERITY_LABELS[s],
      })),
    [],
  );

  // 6. Счётчики и фильтры для toolbar
  const activeCount = useMemo(() => allDefects.filter((d) => !d.isFixed).length, [allDefects]);
  const fixedCount = useMemo(() => allDefects.filter((d) => d.isFixed).length, [allDefects]);
  const hasFilters = !!(filterElementId || filterDefectTypeId || filterSeverity || search);

  // 7. Команды
  const clearFilters = useCallback(() => {
    setFilterElementId('');
    setFilterDefectTypeId('');
    setFilterSeverity('');
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
    severityStats,
    elementOptions,
    defectTypeOptions,
    severityOptions,
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
    filterSeverity,
    sortDir,
    // команды
    toggleSort,
    clearFilters,
    handleElementChange,
    setFilterDefectTypeId,
    setFilterSeverity,
    handleDelete,
    handleDeleteAll,
    confirmProps,
  };
}
