import { memo, useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { CopyDefectSchema } from '../model/copyDefectSlice';
import {
  useGetDefectsBySheetQuery,
  enrichDefects,
  getLocationKey,
  formatLocationLabel,
  locationKeyType,
} from '@/entities/DefectRecord';
import { useGetDefectTypesQuery, useGetElementsQuery, useGetPhasesQuery } from '@/entities/InspectionLine';
import { Button, FormField, Input, Modal } from '@/shared/ui';
import { copyDefectActions } from '../model/copyDefectSlice';
import { parseTargetPoles } from '../lib/parseTargetPoles';
import { useCopyDefect } from '../model/useCopyDefect';
import { CopyDefectList } from './CopyDefectList';

interface CopyDefectRootState {
  copyDefect?: CopyDefectSchema;
}

const selectCopyDefect = (state: CopyDefectRootState) => state.copyDefect;

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

  const sourceDefects = useMemo(() => {
    const sourceKey = copy?.sourceKey;
    if (!sourceKey) return [];
    return allDefects.filter((d) => getLocationKey(d) === sourceKey && !d.isFixed);
  }, [allDefects, copy?.sourceKey]);

  const enriched = useMemo(
    () => enrichDefects(sourceDefects, defectTypes, elements, phases),
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

  const { handleCopy, isLoading } = useCopyDefect({
    sheetId,
    sourceDefects,
    allDefects,
    selectedIds,
    targetPoles,
    enabled: isValid,
    onDone: closeModal,
  });

  const isOpen = !!copy?.isOpen;
  const hasInput = !!copy?.targetPolesInput;
  const sourceKey = copy?.sourceKey ?? '';
  const isSpan = locationKeyType(sourceKey) === 'span';
  const locationLabel = sourceKey ? formatLocationLabel(sourceKey) : '';
  const locationPrefix = isSpan ? 'Пролёты' : 'опоры';

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
      <CopyDefectList
        defects={enriched}
        selectedSet={selectedSet}
        allSelected={allSelected}
        locationLabel={locationLabel}
        locationPrefix={locationPrefix}
        onToggle={toggleDefectId}
        onSelectAll={() => selectAllDefects(allIds)}
        onClear={clearDefectSelection}
      />

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
