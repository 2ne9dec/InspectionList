import { memo, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { StateSchema } from '@/app/providers/StoreProvider';
import {
  useGetDefectsBySheetQuery,
  useFixDefectMutation,
  getLocationKey,
  formatLocationLabel,
  locationKeyType,
} from '@/entities/DefectRecord';
import { useGetDefectTypesQuery } from '@/entities/InspectionLine';
import { Button, EmptyState, FormField, Input, Modal, SeverityDot } from '@/shared/ui';
import { SEVERITY_LABELS } from '@/shared/const/severity';
import { toast } from '@/shared/lib/toast';
import { logger } from '@/shared/lib/logger';
import { fixDefectActions } from '../model/fixDefectSlice';
import cls from './FixDefectModal.module.scss';

const selectFixDefect = (state: StateSchema) => state.fixDefect;

interface FixDefectModalProps {
  sheetId: number;
}

export const FixDefectModal = memo(({ sheetId }: FixDefectModalProps) => {
  const fix = useSelector(selectFixDefect);
  const { closeModal, toggleId, selectAll, clearAll, setDateFixed, setInspectorFix } = fixDefectActions.useActions();

  const { data: allDefects = [] } = useGetDefectsBySheetQuery(sheetId);
  const { data: defectTypes = [] } = useGetDefectTypesQuery();
  const [fixDefect, { isLoading }] = useFixDefectMutation();

  const enriched = useMemo(() => {
    const targetKey = fix?.targetKey;
    if (!targetKey) return [];
    return allDefects
      .filter((d) => getLocationKey(d) === targetKey && !d.isFixed)
      .map((d) => {
        const dt = defectTypes.find((t) => t.id === d.defectId);
        return { ...d, defectName: dt?.name ?? '—', severity: dt?.severity ?? ('low' as const) };
      });
  }, [allDefects, defectTypes, fix?.targetKey]);

  const allIds = useMemo(() => enriched.map((d) => d.id), [enriched]);
  const selectedSet = useMemo(() => new Set(fix?.selectedIds ?? []), [fix?.selectedIds]);
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedSet.has(id));
  const selectedCount = selectedSet.size;

  const isValid = selectedCount > 0 && !!fix?.inspectorFix.trim() && !!fix?.dateFixed;

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
            {enriched.map((d) => (
              <label key={d.id} className={cls.checkRow}>
                <input type='checkbox' checked={selectedSet.has(d.id)} onChange={() => toggleId(d.id)} />
                <SeverityDot severity={d.severity} />
                <span className={cls.defectName}>{d.defectName}</span>
                <span className={cls.severityLabel}>{SEVERITY_LABELS[d.severity]}</span>
              </label>
            ))}
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
