import { memo, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { StateSchema } from '@/app/providers/StoreProvider';
import {
  useGetDefectsBySheetQuery,
  useFixDefectMutation,
  getLocationKey,
  formatLocationLabel,
  locationKeyType,
  enrichDefects,
} from '@/entities/DefectRecord';
import { useGetDefectTypesQuery, useGetElementsQuery, useGetPhasesQuery } from '@/entities/InspectionLine';
import { Button, EmptyState, FormField, Input, Modal } from '@/shared/ui';
import { toast } from '@/shared/lib/toast';
import { logger } from '@/shared/lib/logger';
import { fixDefectActions } from '../model/fixDefectSlice';
import cls from './FixDefectModal.module.scss';

const selectFixDefect = (state: StateSchema) => state.fixDefect;

interface FixDefectModalProps {
  sheetId: number;
}

interface DefectGroup {
  key: string;
  elementName: string;
  defectName: string;
  ids: number[];
  phases: string[];
  insulatorCount: number | null | undefined;
}

export const FixDefectModal = memo(({ sheetId }: FixDefectModalProps) => {
  const fix = useSelector(selectFixDefect);
  const { closeModal, selectAll, clearAll, setDateFixed, setInspectorFix } = fixDefectActions.useActions();

  const { data: allDefects = [] } = useGetDefectsBySheetQuery(sheetId);
  const { data: defectTypes = [] } = useGetDefectTypesQuery();
  const { data: elements = [] } = useGetElementsQuery();
  const { data: phases = [] } = useGetPhasesQuery();
  const [fixDefect, { isLoading }] = useFixDefectMutation();

  // Сортируем: элемент → дефект → фаза (алфавитно)
  const enriched = useMemo(() => {
    const targetKey = fix?.targetKey;
    if (!targetKey) return [];
    const filtered = allDefects.filter((d) => getLocationKey(d) === targetKey && !d.isFixed);
    const list = enrichDefects(filtered, defectTypes, elements, phases);
    return [...list].sort((a, b) => {
      const elCmp = (a.elementName ?? '').localeCompare(b.elementName ?? '');
      if (elCmp !== 0) return elCmp;
      const defCmp = (a.defectName ?? '').localeCompare(b.defectName ?? '');
      if (defCmp !== 0) return defCmp;
      return (a.phaseName ?? '').localeCompare(b.phaseName ?? '');
    });
  }, [allDefects, defectTypes, elements, phases, fix?.targetKey]);

  // Группируем по elementName + defectName
  const groups = useMemo<DefectGroup[]>(() => {
    const result: DefectGroup[] = [];
    for (const d of enriched) {
      const key = `${d.elementName}||${d.defectName}`;
      const last = result[result.length - 1];
      if (last && last.key === key) {
        last.ids.push(d.id);
        if (d.phaseName) last.phases.push(d.phaseName);
        if (d.insulatorCount != null && d.insulatorCount > 0) {
          last.insulatorCount = (last.insulatorCount ?? 0) + d.insulatorCount;
        }
      } else {
        result.push({
          key,
          elementName: d.elementName,
          defectName: d.defectName,
          ids: [d.id],
          phases: d.phaseName ? [d.phaseName] : [],
          insulatorCount: d.insulatorCount,
        });
      }
    }
    return result;
  }, [enriched]);

  const allIds = useMemo(() => enriched.map((d) => d.id), [enriched]);
  const selectedSet = useMemo(() => new Set(fix?.selectedIds ?? []), [fix?.selectedIds]);
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedSet.has(id));
  const selectedCount = selectedSet.size;

  const isValid = selectedCount > 0 && !!fix?.inspectorFix.trim() && !!fix?.dateFixed;

  const handleGroupToggle = useCallback((groupIds: number[]) => {
    const allGroupSelected = groupIds.every((id) => selectedSet.has(id));
    const next = new Set(selectedSet);
    if (allGroupSelected) {
      groupIds.forEach((id) => next.delete(id));
    } else {
      groupIds.forEach((id) => next.add(id));
    }
    selectAll([...next]);
  }, [selectedSet, selectAll]);

  const handleFix = useCallback(async () => {
    if (!isValid || !fix) return;
    try {
      await Promise.all(
        fix.selectedIds.map((id) =>
          fixDefect({ id, dateFixed: fix.dateFixed, inspectorFix: fix.inspectorFix.trim(), isFixed: true }).unwrap(),
        ),
      );
      closeModal();
      toast.success(selectedCount === 1 ? 'Дефект отмечен как устранённый' : `Дефектов устранено: ${selectedCount}`);
    } catch (err) {
      logger.error('FixDefect failed', err);
      toast.error('Ошибка при устранении дефектов');
    }
  }, [closeModal, fix, fixDefect, isValid, selectedCount]);

  const isOpen = !!fix?.isOpen;
  const targetKey = fix?.targetKey ?? '';
  const isSpan = locationKeyType(targetKey) === 'span';
  const locationLabel = targetKey ? formatLocationLabel(targetKey) : '';
  const titlePrefix = isSpan ? 'Пролёты' : 'опора';

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeModal}
      title={`Устранение дефектов — ${titlePrefix} ${locationLabel}`}
      size='m'
      footer={
        <>
          <Button variant='secondary' onClick={() => closeModal()}>
            Отмена
          </Button>
          {enriched.length > 0 && (
            <Button variant='primary' onClick={handleFix} disabled={!isValid} loading={isLoading}>
              {`Устранить (${selectedCount})`}
            </Button>
          )}
        </>
      }
    >
      {enriched.length === 0 ? (
        <EmptyState compact title={`Нет активных дефектов на ${titlePrefix}е ${locationLabel}`} />
      ) : (
        <>
          <div className={cls.selectAll}>
            <label className={cls.checkRow}>
              <input
                type='checkbox'
                checked={allSelected}
                onChange={() => (allSelected ? clearAll() : selectAll(allIds))}
              />
              <span>Выбрать все ({enriched.length})</span>
            </label>
          </div>

          <div className={cls.list}>
            {groups.map((g) => {
              const groupAllSelected = g.ids.every((id) => selectedSet.has(id));
              return (
                <label key={g.key} className={cls.checkRow}>
                  <input
                    type='checkbox'
                    checked={groupAllSelected}
                    onChange={() => handleGroupToggle(g.ids)}
                  />
                  <span className={cls.defectLabel}>
                    <span className={cls.elementName}>{g.elementName}</span>
                    <span className={cls.defectRow}>
                      <span className={cls.defectName}>{g.defectName}</span>
                      <span className={cls.tags}>
                        {g.phases.map((ph) => (
                          <span key={ph} className={cls.phaseTag}>{ph}</span>
                        ))}
                        {g.insulatorCount != null && g.insulatorCount > 0 && (
                          <span className={cls.phaseTag}>{g.insulatorCount} шт.</span>
                        )}
                      </span>
                    </span>
                  </span>
                </label>
              );
            })}
          </div>

          <div className={cls.fields}>
            <FormField label='Дата устранения' required htmlFor='fix-date'>
              <Input id='fix-date' name='dateFixed' type='date' value={fix?.dateFixed ?? ''}
                onChange={setDateFixed} />
            </FormField>

            <FormField label='Устранил (ФИО)' required htmlFor='fix-inspector'>
              <Input
                id='fix-inspector'
                name='inspectorFix'
                value={fix?.inspectorFix ?? ''}
                placeholder='Петров П.П.'
                onChange={setInspectorFix}
              />
            </FormField>
          </div>
        </>
      )}
    </Modal>
  );
});

FixDefectModal.displayName = 'FixDefectModal';
