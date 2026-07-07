import { memo, useCallback } from 'react';
import { Button } from '@/shared/ui';
import { useJournalFilters } from '../model/useJournalFilters';
import { useJournalEdit } from '../model/useJournalEdit';
import { JournalFilters } from './JournalFilters';
import { JournalTable } from './JournalTable';
import { JournalEmptyState } from './JournalEmptyState';
import { MasterConclusionModal } from './MasterConclusionModal';
import cls from './JournalPage.module.scss';

export const JournalPage = memo(() => {
  const filters = useJournalFilters();
  const edit    = useJournalEdit(filters.defects);

  const handleSave = useCallback(() => {
    edit.handleSave(filters.clearSelection);
  }, [edit, filters.clearSelection]);

  return (
    <div className={cls.page}>

      <div className={cls.pageHeader}>
        <span className={cls.title}>Журнал дефектов</span>
        {filters.isGated
          ? <span className={cls.count}>{filters.filialDefectCount} зап.</span>
          : <span className={cls.count}>{filters.rows.length} зап.</span>
        }
      </div>

      <JournalFilters
        voltages={filters.voltages}
        filteredLines={filters.filteredLines}
        elements={filters.elements}
        defectTypes={filters.defectTypes}
        statusFilter={filters.statusFilter}
        voltageFilter={filters.voltageFilter}
        lineFilter={filters.lineFilter}
        selectedDefectTypeIds={filters.selectedDefectTypeIds}
        inspectorFilter={filters.inspectorFilter}
        dateFrom={filters.dateFrom}
        dateTo={filters.dateTo}
        hasFilters={filters.hasFilters}
        setStatusFilter={filters.setStatusFilter}
        handleVoltageChange={filters.handleVoltageChange}
        setLineFilter={filters.setLineFilter}
        setSelectedDefectTypeIds={filters.setSelectedDefectTypeIds}
        setInspectorFilter={filters.setInspectorFilter}
        setDateFrom={filters.setDateFrom}
        setDateTo={filters.setDateTo}
        resetFilters={filters.resetFilters}
      />

      <div className={cls.selectionRow}>
        {filters.selectedIds.size > 0 && (
          <>
            <span className={cls.selectionCount}>
              Выбрано: <strong>{filters.selectedIds.size}</strong>
            </span>
            <Button
              size='s'
              variant='primary'
              onClick={() => edit.openEdit(Array.from(filters.selectedIds))}
            >
              Заключение мастера
            </Button>
            <Button variant='ghost' size='s' square
              onClick={filters.clearSelection}
              aria-label='Снять выделение'
            >✕</Button>
          </>
        )}
      </div>

      {filters.isGated ? (
        <JournalEmptyState totalCount={filters.filialDefectCount} onShowAll={filters.handleShowAll} />
      ) : (
        <JournalTable
          rows={filters.rows}
          selectedIds={filters.selectedIds}
          allSelected={filters.allSelected}
          onSelectAll={filters.handleSelectAll}
          onSelect={filters.handleSelect}
          onEditRow={(id) => edit.openEdit([id])}
        />
      )}

      <MasterConclusionModal
        isOpen={edit.isOpen}
        saving={edit.saving}
        targetCount={edit.targetIds.length}
        conclusion={edit.conclusion}     setConclusion={edit.setConclusion}
        deadline={edit.deadline}         setDeadline={edit.setDeadline}
        masterName={edit.masterName}     setMasterName={edit.setMasterName}
        dateFixed={edit.dateFixed}       setDateFixed={edit.setDateFixed}
        workVolume={edit.workVolume}     setWorkVolume={edit.setWorkVolume}
        inspectorFix={edit.inspectorFix} setInspectorFix={edit.setInspectorFix}
        onClose={edit.closeEdit}
        onSave={handleSave}
      />

    </div>
  );
});

JournalPage.displayName = 'JournalPage';
