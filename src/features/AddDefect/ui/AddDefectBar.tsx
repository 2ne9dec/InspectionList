import { memo, useCallback, useMemo, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useCreateDefectMutation } from '@/entities/DefectRecord';
import {
  useGetDefectTypesQuery,
  useGetElementsQuery,
  useGetPhasesQuery,
} from '@/entities/InspectionLine';
import type { DefectType } from '@/entities/InspectionLine';
import { Button, FormField, HStack, Input, MultiSelect, SelectMenu } from '@/shared/ui';
import type { SelectOption } from '@/shared/ui';
import { toast } from '@/shared/lib/toast';
import { logger } from '@/shared/lib/logger';
import { addDefectSlice } from '../model/addDefectSlice';
import {
  selectAddDefectDate,
  selectAddDefectInspector,
  selectAddDefectPhaseIds,
  selectAddDefectPole,
  selectAddDefectSelectedId,
  selectAddDefectInsulatorCount,
  selectAddDefectSpanRange,
  selectAddDefectGarlandNumber,
} from '../model/selectors';
import { useDraft } from '../model/useDraft';
import { useTopDefects } from '../model/useTopDefects';
import { DefectPicker } from './DefectPicker';
import { QuickDefectChips } from './QuickDefectChips';
import cls from './AddDefectBar.module.scss';

const GARLAND_OPTIONS   = Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }));
const INSULATOR_OPTIONS = Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }));

/** Диапазон вида «1-10» или «1–10» → пролёт, иначе → опора */
const detectRange = (val: string) => /\d[-–]\d/.test(val.trim());

interface AddDefectBarProps {
  sheetId: number;
  poleStart: number;
  poleEnd: number;
  sheetDate?: string;
  sheetInspector?: string;
}

export const AddDefectBar = memo(({ sheetId, poleStart, poleEnd, sheetDate, sheetInspector }: AddDefectBarProps) => {
  const selectedDefectId  = useSelector(selectAddDefectSelectedId);
  const selectedPhaseIds  = useSelector(selectAddDefectPhaseIds);
  const garlandNumber     = useSelector(selectAddDefectGarlandNumber);
  const poleNumber        = useSelector(selectAddDefectPole);
  const inspectorRaw      = useSelector(selectAddDefectInspector);
  const dateFoundRaw      = useSelector(selectAddDefectDate);
  const inspector  = inspectorRaw  || sheetInspector || '';
  const dateFound  = dateFoundRaw  || sheetDate      || '';
  const insulatorCount    = useSelector(selectAddDefectInsulatorCount);
  const spanRange         = useSelector(selectAddDefectSpanRange);

  const {
    selectDefect,
    clearDefectSelection,
    setPhaseIds,
    setGarlandNumber,
    setPoleNumber,
    setInspector,
    setDateFound,
    setInsulatorCount,
    setSpanRange,
    resetDate,
  } = addDefectSlice.useActions();

  useEffect(() => {
    if (sheetDate) setDateFound(sheetDate); else resetDate();
    if (sheetInspector) setInspector(sheetInspector);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Черновик ──────────────────────────────────────────────────────────
  const { handleClearDraft } = useDraft({
    sheetId,
    selectedDefectId,
    poleNumber,
    selectedPhaseIds,
  });

  // ── Топ-дефекты ───────────────────────────────────────────────────────
  const { data: elements    = [] } = useGetElementsQuery();
  const { data: defectTypes = [] } = useGetDefectTypesQuery();
  const { data: phases      = [] } = useGetPhasesQuery();

  const topDefects = useTopDefects(sheetId, defectTypes);

  // ── Вычисляемые ───────────────────────────────────────────────────────
  const selectedDefect = useMemo(
    () => defectTypes.find((d) => d.id === selectedDefectId),
    [defectTypes, selectedDefectId],
  );
  const selectedElement = useMemo(
    () => elements.find((e) => selectedDefect && e.id === selectedDefect.elementId),
    [elements, selectedDefect],
  );

  const poleNum = Number.parseInt(poleNumber, 10);
  const isPoleValid = Number.isFinite(poleNum) && poleNum >= poleStart && poleNum <= poleEnd;
  const hasLocation = (!!poleNumber && isPoleValid) || !!spanRange.trim();
  const isValid = !!selectedDefectId && hasLocation && inspector.trim().length > 0 && !!dateFound;

  const phaseOptions = useMemo<SelectOption<number>[]>(
    () => phases.map((p) => ({ value: p.id, label: p.name })),
    [phases],
  );

  // ── Handlers ──────────────────────────────────────────────────────────
  const handlePoleStep = useCallback(
    (delta: number) => {
      const cur = Number.parseInt(poleNumber, 10);
      const next = Number.isFinite(cur) ? cur + delta : delta > 0 ? poleStart : poleEnd;
      const clamped = Math.min(poleEnd, Math.max(poleStart, next));
      setPoleNumber(String(clamped));
      setSpanRange('');
    },
    [poleNumber, poleStart, poleEnd, setPoleNumber, setSpanRange],
  );

  const handleLocationChange = useCallback(
    (val: string) => {
      if (detectRange(val)) {
        setSpanRange(val);
        setPoleNumber('');
      } else {
        setPoleNumber(val);
        setSpanRange('');
      }
    },
    [setPoleNumber, setSpanRange],
  );

  const handlePickDefect = useCallback(
    (defect: DefectType) => selectDefect({ defectId: defect.id, elementId: defect.elementId }),
    [selectDefect],
  );

  const [createDefect, { isLoading }] = useCreateDefectMutation();

  const handleSubmit = useCallback(async () => {
    if (!isValid || !selectedDefectId) return;
    const phaseIdsToCreate = selectedPhaseIds.length > 0 ? selectedPhaseIds : [null];
    const insCount   = insulatorCount ? Number(insulatorCount) : null;
    const garlandNum = garlandNumber  ? Number(garlandNumber)  : null;
    try {
      await Promise.all(
        phaseIdsToCreate.map((phaseId) =>
          createDefect({
            sheetId,
            poleNumber:     poleNumber ? poleNum : 0,
            defectId:       selectedDefectId,
            phaseId:        phaseId ?? null,
            dateFound,
            inspectorFind:  inspector.trim(),
            insulatorCount: insCount,
            spanRange:      spanRange || null,
            garlandNumber:  garlandNum,
          }).unwrap(),
        ),
      );
      handleClearDraft();
      toast.success(
        phaseIdsToCreate.length > 1
          ? `Дефект добавлен для ${phaseIdsToCreate.length} фаз`
          : 'Дефект добавлен',
      );
    } catch (err) {
      logger.error('AddDefect failed', err);
      const status = (err as { status?: number })?.status;
      if (status === 409) {
        toast.warning('Такой дефект уже добавлен на эту опору в данном листке');
      } else {
        toast.error('Ошибка при добавлении дефекта');
      }
    }
  }, [
    handleClearDraft,
    createDefect,
    dateFound,
    inspector,
    isValid,
    insulatorCount,
    garlandNumber,
    poleNumber,
    poleNum,
    selectedDefectId,
    selectedPhaseIds,
    sheetId,
    spanRange,
  ]);

  return (
    <HStack gap='2' align='end' wrap='wrap' className={cls.bar}>
      <div className={cls.dateField}>
        <FormField label='Дата' htmlFor='add-date'>
          <Input
            id='add-date'
            name='dateFound'
            type='date'
            value={dateFound}
            onChange={setDateFound}
            onClick={(e) => (e.currentTarget as HTMLInputElement & { showPicker?: () => void }).showPicker?.()}
          />
        </FormField>
      </div>

      <div className={cls.inspectorField}>
        <FormField label='Обнаружил' htmlFor='add-inspector'>
          <Input
            id='add-inspector'
            name='inspector'
            value={inspector}
            placeholder='Иванов И.И.'
            onChange={setInspector}
          />
        </FormField>
      </div>

      <div className={cls.locationField}>
        <FormField label='Опора / Пролёт' htmlFor='add-location'>
          <div className={cls.stepWrap}>
            <button
              type='button'
              className={cls.stepBtn}
              onClick={() => handlePoleStep(-1)}
              tabIndex={-1}
              disabled={!!spanRange}
            >−</button>
            <Input
              id='add-location'
              name='location'
              inputMode='tel'
              placeholder={`${poleStart}–${poleEnd}`}
              value={poleNumber || spanRange}
              onChange={handleLocationChange}
              invalid={!!poleNumber && !isPoleValid}
              className={cls.stepInput}
            />
            <button
              type='button'
              className={cls.stepBtn}
              onClick={() => handlePoleStep(1)}
              tabIndex={-1}
              disabled={!!spanRange}
            >+</button>
          </div>
        </FormField>
      </div>

      <DefectPicker
        elements={elements}
        defectTypes={defectTypes}
        selectedDefect={selectedDefect}
        selectedElement={selectedElement}
        onSelect={handlePickDefect}
        onClear={clearDefectSelection}
      />

      {phases.length > 0 && (
        <div className={cls.smallField}>
          <FormField label='Фазы' htmlFor='add-phases'>
            <MultiSelect<number>
              id='add-phases'
              options={phaseOptions}
              values={selectedPhaseIds}
              onChange={setPhaseIds}
              placeholder='—'
            />
          </FormField>
        </div>
      )}

      <div className={cls.smallField}>
        <FormField label='Гирлянда' htmlFor='add-garland'>
          <SelectMenu
            id='add-garland'
            options={GARLAND_OPTIONS}
            value={garlandNumber}
            onChange={setGarlandNumber}
            placeholder='—'
          />
        </FormField>
      </div>

      <div className={cls.smallField}>
        <FormField label='Изол.' htmlFor='add-insulator-count'>
          <SelectMenu
            id='add-insulator-count'
            options={INSULATOR_OPTIONS}
            value={insulatorCount}
            onChange={setInsulatorCount}
            placeholder='—'
          />
        </FormField>
      </div>

      <div className={cls.submitWrap}>
        <Button
          variant='primary'
          size='m'
          onClick={handleSubmit}
          disabled={!isValid}
          loading={isLoading}
        >
          + Добавить
        </Button>
      </div>

      <QuickDefectChips
        topDefects={topDefects}
        elements={elements}
        selectedDefectId={selectedDefectId}
        onSelect={handlePickDefect}
      />
    </HStack>
  );
});

AddDefectBar.displayName = 'AddDefectBar';
