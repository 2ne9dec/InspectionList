import { memo, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { StateSchema } from '@/app/providers/StoreProvider';
import {
  useCreateDefectMutation,
  useGetDefectsBySheetQuery,
  getLocationKey,
  formatLocationLabel,
  locationKeyType,
} from '@/entities/DefectRecord';
import { useGetDefectTypesQuery, useGetElementsQuery, useGetPhasesQuery } from '@/entities/InspectionLine';
import { Button, EmptyState, FormField, Input, Modal, SeverityDot } from '@/shared/ui';
import { SEVERITY_LABELS } from '@/shared/const/severity';
import { toast } from '@/shared/lib/toast';
import { logger } from '@/shared/lib/logger';
import { copyDefectActions } from '../model/copyDefectSlice';
import { parseTargetPoles } from '../lib/parseTargetPoles';
import cls from './CopyDefectModal.module.scss';

const selectCopyDefect = (state: StateSchema) => state.copyDefect;

interface CopyDefectModalProps {
  sheetId: number;
  poleStart: number;
  poleEnd: number;
}

export const CopyDefectModal = memo((props: CopyDefectModalProps) => {
  const { sheetId, poleStart, poleEnd } = props;

  const copy = useSelector(selectCopyDefect);
  const { closeModal, setTargetPolesInput, toggleDefectId, selectAllDefects, clearDefectSelection } =
    copyDefectActions.useActions();

  const { data: allDefects = [] } = useGetDefectsBySheetQuery(sheetId);
  const { data: defectTypes = [] } = useGetDefectTypesQuery();
  const { data: elements = [] } = useGetElementsQuery();
  const { data: phases = [] } = useGetPhasesQuery();
  const [createDefect, { isLoading }] = useCreateDefectMutation();

  const sourceDefects = useMemo(() => {
    const sourceKey = copy?.sourceKey;
    if (!sourceKey) return [];
    return allDefects.filter((d) => getLocationKey(d) === sourceKey && !d.isFixed);
  }, [allDefects, copy?.sourceKey]);

  const enriched = useMemo(
    () =>
      sourceDefects.map((d) => {
        const dt = defectTypes.find((t) => t.id === d.defectId);
        const el = elements.find((e) => e.id === dt?.element_id);
        const ph = d.phaseId != null ? phases.find((p) => p.id === d.phaseId) : undefined;
        return {
          ...d,
          elementName: el?.name ?? '—',
          defectName: dt?.name ?? '—',
          severity: dt?.severity ?? ('low' as const),
          phaseName: ph?.name ?? null,
        };
      }),
    [sourceDefects, defectTypes, elements, phases],
  );

  const targetPoles = useMemo(
    () => parseTargetPoles(copy?.targetPolesInput ?? '', poleStart, poleEnd),
    [copy?.targetPolesInput, poleStart, poleEnd],
  );

  const allIds = useMemo(() => enriched.map((d) => d.id), [enriched]);
  const selectedIds = useMemo(() => copy?.selectedDefectIds ?? [], [copy?.selectedDefectIds]);
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedSet.has(id));
  const isValid = targetPoles.length > 0 && selectedSet.size > 0;

  const handleCopy = useCallback(async () => {
    if (!isValid || !copy) return;
    const defectsToCopy = sourceDefects.filter((d) => selectedIds.includes(d.id));

    let created = 0;
    let skipped = 0;

    try {
      for (const pole of targetPoles) {
        const newDefects = defectsToCopy.filter((d) => {
          const exists = allDefects.some(
            (ex) => ex.poleNumber === pole && ex.defectId === d.defectId && ex.phaseId === d.phaseId,
          );
          if (exists) {
            skipped += 1;
            return false;
          }
          return true;
        });

        if (newDefects.length > 0) {
          await Promise.all(
            newDefects.map((d) =>
              createDefect({
                sheetId,
                poleNumber: pole,
                defectId: d.defectId,
                phaseId: d.phaseId,
                dateFound: d.dateFound,
                inspectorFind: d.inspectorFind,
                isFixed: false,
                dateFixed: null,
                inspectorFix: null,
              }).unwrap(),
            ),
          );
          created += newDefects.length;
        }
      }

      closeModal();

      if (created > 0 && skipped > 0) {
        toast.success(`Скопировано: ${created} деф. Пропущено (уже есть): ${skipped}`);
      } else if (created > 0) {
        toast.success(`Скопировано: ${created} деф. × ${targetPoles.length} оп.`);
      } else {
        toast.info('Все выбранные дефекты уже есть на целевых опорах — ничего не добавлено');
      }
    } catch (err) {
      logger.error('CopyDefect failed', err);
      toast.error('Ошибка при копировании дефектов');
    }
  }, [allDefects, closeModal, copy, createDefect, isValid, selectedIds, sheetId, sourceDefects, targetPoles]);

  const isOpen = !!copy?.isOpen;
  const hasInput = !!copy?.targetPolesInput;
  const sourceKey = copy?.sourceKey ?? '';
  const isSpan = locationKeyType(sourceKey) === 'span';
  const locationLabel = sourceKey ? formatLocationLabel(sourceKey) : '';
  const locationPrefix = isSpan ? 'Пролётыа' : 'опоры';

  const inputError =
    hasInput && targetPoles.length === 0 ? `Нет допустимых опор в диапазоне ${poleStart}–${poleEnd}` : undefined;
  const inputHint =
    hasInput && targetPoles.length > 0
      ? `Будет скопировано на: ${targetPoles.join(', ')} (${targetPoles.length} оп.)`
      : undefined;

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeModal}
      title={`Копировать дефекты с ${locationPrefix} ${locationLabel}`}
      size='m'
      footer={
        <>
          <Button variant='secondary' onClick={() => closeModal()}>
            Отмена
          </Button>
          <Button variant='primary' onClick={handleCopy} disabled={!isValid} loading={isLoading}>
            {`Копировать ${selectedSet.size} деф. на ${targetPoles.length} опор`}
          </Button>
        </>
      }
    >
      <div className={cls.section}>
        <div className={cls.sectionHeader}>
          <p className={cls.sectionTitle}>Выберите дефекты для копирования:</p>
          <button
            type='button'
            className={cls.selectLink}
            onClick={() => (allSelected ? clearDefectSelection() : selectAllDefects(allIds))}
          >
            {allSelected ? 'Снять все' : 'Выбрать все'}
          </button>
        </div>

        {enriched.length === 0 ? (
          <EmptyState compact title={`Нет активных дефектов на ${locationPrefix} ${locationLabel}`} />
        ) : (
          <div className={cls.defectList}>
            {enriched.map((d) => (
              <label key={d.id} className={cls.defectCheckRow}>
                <input type='checkbox' checked={selectedSet.has(d.id)} onChange={() => toggleDefectId(d.id)} />
                <SeverityDot severity={d.severity} />
                <span className={cls.elementLabel}>{d.elementName}</span>
                <span className={cls.defectLabel}>{d.defectName}</span>
                {d.phaseName && (
                  <span className={cls.phaseLabel} title={`Фаза ${d.phaseName}`}>
                    {d.phaseName}
                  </span>
                )}
                <span className={cls.sevLabel}>{SEVERITY_LABELS[d.severity]}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      <FormField
        label='Целевые опоры (через запятую или диапазон: 12, 15, 18-20)'
        htmlFor='copy-poles'
        error={inputError}
        hint={inputHint}
      >
        <Input
          id='copy-poles'
          name='targetPoles'
          value={copy?.targetPolesInput ?? ''}
          placeholder='например: 13, 14, 16-19'
          onChange={setTargetPolesInput}
          invalid={!!inputError}
        />
      </FormField>
    </Modal>
  );
});

CopyDefectModal.displayName = 'CopyDefectModal';
