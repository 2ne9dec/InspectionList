import { useCallback, useState } from 'react';
import type { JournalStatusFilter } from '../lib/journalRows';

/**
 * Состояние фильтров журнала и «ворот» ручного показа.
 * Любое изменение фильтра сбрасывает ручной показ — как и раньше.
 */
export function useJournalFilterState() {
  const [statusFilter,          setStatusFilterRaw]          = useState<JournalStatusFilter>('all');
  const [voltageFilter,         setVoltageFilterRaw]         = useState('');
  const [lineFilter,            setLineFilterRaw]            = useState('');
  const [selectedDefectTypeIds, setSelectedDefectTypeIdsRaw] = useState<Set<number>>(new Set());
  const [inspectorFilter,       setInspectorFilterRaw]       = useState('');
  const [dateFrom,              setDateFromRaw]              = useState('');
  const [dateTo,                setDateToRaw]                = useState('');
  const [poleFilter,            setPoleFilterRaw]            = useState('');

  const [showAll, setShowAll] = useState(false);

  const handleShowAll = useCallback(() => setShowAll(true), []);

  const setStatusFilter = useCallback((v: JournalStatusFilter) => {
    setStatusFilterRaw(v);
    setShowAll(false);
  }, []);

  const setLineFilter = useCallback((v: string) => {
    setLineFilterRaw(v);
    setShowAll(false);
  }, []);

  const setInspectorFilter = useCallback((v: string) => {
    setInspectorFilterRaw(v);
    setShowAll(false);
  }, []);

  const setPoleFilter = useCallback((v: string) => {
    setPoleFilterRaw(v);
    setShowAll(false);
  }, []);

  const setDateFrom = useCallback((v: string) => {
    setDateFromRaw(v);
    setShowAll(false);
  }, []);

  const setDateTo = useCallback((v: string) => {
    setDateToRaw(v);
    setShowAll(false);
  }, []);

  const setSelectedDefectTypeIds = useCallback((ids: Set<number>) => {
    setSelectedDefectTypeIdsRaw(ids);
    setShowAll(false);
  }, []);

  const handleVoltageChange = useCallback((value: string) => {
    setVoltageFilterRaw(value);
    setLineFilterRaw('');
    setShowAll(false);
  }, []);

  const resetFilters = useCallback(() => {
    setStatusFilterRaw('all');
    setVoltageFilterRaw('');
    setLineFilterRaw('');
    setSelectedDefectTypeIdsRaw(new Set());
    setInspectorFilterRaw('');
    setPoleFilterRaw('');
    setDateFromRaw('');
    setDateToRaw('');
    setShowAll(false);
  }, []);

  const hasFilters = Boolean(
    statusFilter !== 'all' || voltageFilter || lineFilter
    || selectedDefectTypeIds.size > 0 || inspectorFilter || poleFilter || dateFrom || dateTo,
  );

  return {
    statusFilter,
    voltageFilter,
    lineFilter,
    selectedDefectTypeIds,
    inspectorFilter,
    dateFrom,
    dateTo,
    poleFilter,
    hasFilters,
    isGated: !showAll,
    handleShowAll,
    resetFilters,
    setStatusFilter,
    handleVoltageChange,
    setLineFilter,
    setSelectedDefectTypeIds,
    setInspectorFilter,
    setPoleFilter,
    setDateFrom,
    setDateTo,
  };
}
