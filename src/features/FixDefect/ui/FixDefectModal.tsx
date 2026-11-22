import { memo } from 'react';
import { useSelector } from 'react-redux';
import type { FixDefectSchema } from '../model/fixDefectSlice';
import { formatLocationLabel, locationKeyType } from '@/entities/DefectRecord';
import { Button, Checkbox, EmptyState, FormField, Input, Modal } from '@/shared/ui';
import { fixDefectActions } from '../model/fixDefectSlice';
import { useFixDefectSubmit } from '../model/useFixDefectSubmit';
import { useFixDefectGroups } from '../model/useFixDefectGroups';
import cls from './FixDefectModal.module.scss';

interface FixDefectRootState {
  fixDefect?: FixDefectSchema;
}

const selectFixDefect = (state: FixDefectRootState) => state.fixDefect;

interface FixDefectModalProps {
  sheetId: number;
}

export const FixDefectModal = memo(({ sheetId }: FixDefectModalProps) => {
  const fix = useSelector(selectFixDefect);
  const { closeModal, selectAll, clearAll, setDateFixed, setInspectorFix } = fixDefectActions.useActions();

  const {
    enriched,
    groups,
    allIds,
    selectedSet,
    allSelected,
    selectedCount,
    isValid,
    handleGroupToggle,
  } = useFixDefectGroups({ sheetId, fix, selectAll });

  const { handleFix, isLoading } = useFixDefectSubmit({
    fix,
    isValid,
    selectedCount,
    onDone: closeModal,
  });

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
              <Checkbox
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
                  <Checkbox
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
                title={fix?.inspectorFix || undefined}
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
