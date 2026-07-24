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
import { capitalizeFirst } from '@/shared/lib/helpers';
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
  selectAddDefectMode,
} from '../model/selectors';
import { useDraft } from '../model/useDraft';
import { useTopDefects } from '../model/useTopDefects';
import { DefectPicker } from './DefectPicker';
import { QuickDefectChips } from './QuickDefectChips';
import cls from './AddDefectBar.module.scss';

const GARLAND_CLEAR     = { value: '', label: '—' };
const GARLAND_OPTIONS   = [GARLAND_CLEAR, ...Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))];
const INSULATOR_OPTIONS = [GARLAND_CLEAR, ...Array.from({ length: 24 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))];

/**
 * Parses "1, 3, 5-7" -> [1, 3, 5, 6, 7].
 * Returns empty array if any value is outside [min, max].
 */
function parsePoleList(raw: string, min: number, max: number): number[] {
  const result: number[] = [];
  for (const part of raw.split(',')) {
    const t = part.trim();
    const range = t.match(/^(\d+)\s*[-–]\s*(\d+)$/);
    if (range) {
      const a = Number(range[1]), b = Number(range[2]);
      if (a > b || a < min || b > max) return [];
      for (let i = a; i <= b; i++) result.push(i);
    } else {
      const n = Number(t);
      if (!Number.isInteger(n) || n < min || n > max) return [];
      result.push(n);
    }
  }
  return result;
}

/**
 * Validates span range string e.g. "3-7" or "5".
 * maxSpan = poleEnd - 1 (number of spans = number of poles - 1).
 */
function isSpanValid(raw: string, maxSpan: number): boolean {
  const t = raw.trim();
  if (!t) return false;
  const range = t.match(/^(\d+)\s*[-–]\s*(\d+)$/);
  if (range) {
    const a = Number(range[1]), b = Number(range[2]);
    return a >= 1 && b <= maxSpan && a <= b;
  }
  const n = Number(t);
  return Number.isInteger(n) && n >= 1 && n <= maxSpan;
}

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
  const mode              = useSelector(selectAddDefectMode);
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
    setMode,
    resetDate,
  } = addDefectSlice.useActions();

  useEffect(() => {
    if (sheetDate) setDateFound(sheetDate); else resetDate();
    if (sheetInspector) setInspector(sheetInspector);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const { handleClearDraft } = useDraft({ sheetId, selectedDefectId, poleNumber, selectedPhaseIds });

  const { data: elements    = [] } = useGetElementsQuery();
  const { data: defectTypes = [] } = useGetDefectTypesQuery();
  const { data: phases      = [] } = useGetPhasesQuery();

  const topDefects = useTopDefects(sheetId, defectTypes);

  const selectedDefect = useMemo(
    () => defectTypes.find((d) => d.id === selectedDefectId),
    [defectTypes, selectedDefectId],
  );
  const selectedElement = useMemo(
    () => elements.find((e) => selectedDefect && e.id === selectedDefect.elementId),
    [elements, selectedDefect],
  );

  // Валидация
  const maxSpan = poleEnd;
  const isPoleValid  = mode === 'pole' && poleNumber.trim().length > 0
    && parsePoleList(poleNumber, poleStart, poleEnd).length > 0;
  const isSpanOk = mode === 'span' && isSpanValid(spanRange, maxSpan);
  const hasLocation = isPoleValid || isSpanOk;
  const isValid = !!selectedDefectId && hasLocation && inspector.trim().length > 0 && !!dateFound;

  // Подсветка ошибок
  const poleInvalid = mode === 'pole' && !!poleNumber.trim() && !isPoleValid;
  const spanInvalid = mode === 'span' && !!spanRange.trim() && !isSpanOk;

  const phaseOptions = useMemo<SelectOption<number>[]>(
    () => phases.map((p) => ({ value: p.id, label: capitalizeFirst(p.name) })),
    [phases],
  );

  const handlePoleStep = useCallback(
    (delta: number) => {
      if (mode !== 'pole') return;
      // Работает только если одна опора без запятых
      const cur = Number.parseInt(poleNumber, 10);
      const next = Number.isFinite(cur) ? cur + delta : delta > 0 ? poleStart : poleEnd;
      const clamped = Math.min(poleEnd, Math.max(poleStart, next));
      setPoleNumber(String(clamped));
    },
    [poleNumber, poleStart, poleEnd, mode, setPoleNumber],
  );

  const handlePickDefect = useCallback(
    (defect: DefectType) => selectDefect({ defectId: defect.id, elementId: defect.elementId }),
    [selectDefect],
  );

  const [createDefect, { isLoading }] = useCreateDefectMutation();

  const handleSubmit = useCallback(async () => {
    if (!isValid || !selectedDefectId) return;
    const sortedPhaseIds = selectedPhaseIds.length > 0
      ? [...selectedPhaseIds].sort((a, b) => {
          const nameA = phases.find((p) => p.id === a)?.name ?? '';
          const nameB = phases.find((p) => p.id === b)?.name ?? '';
          return nameA.localeCompare(nameB);
        })
      : [];
    const phaseIdsToCreate = sortedPhaseIds.length > 0 ? sortedPhaseIds : [null];
    const insCount   = insulatorCount ? Number(insulatorCount) : null;
    const garlandNum = garlandNumber  ? Number(garlandNumber)  : null;
    try {
      if (mode === 'pole') {
        const poles = parsePoleList(poleNumber, poleStart, poleEnd);
        await Promise.all(
          poles.flatMap((pole) =>
            phaseIdsToCreate.map((phaseId) =>
              createDefect({
                sheetId,
                poleNumber: pole,
                defectId: selectedDefectId,
                phaseId: phaseId ?? null,
                dateFound,
                inspectorFind: inspector.trim(),
                insulatorCount: insCount,
                spanRange: null,
                garlandNumber: garlandNum,
                notes: null,
              }).unwrap(),
            ),
          ),
        );
        // Скрол к первой добавленной опоре
        const firstPole = poles[0];
        const locationKey = `о:${firstPole}`;
        setTimeout(() => {
          const wrap = document.querySelector('[data-defect-table-wrap]') as HTMLElement | null;
          const target = wrap?.querySelector(`[data-pole-key="${locationKey}"]`) as HTMLElement | null;
          if (wrap && target) {
            wrap.scrollTo({ top: target.offsetTop - wrap.offsetTop - 8, behavior: 'smooth' });
          } else if (wrap) {
            wrap.scrollTo({ top: 9_999_999, behavior: 'smooth' });
          }
        }, 500);
      } else {
        // Span mode
        await Promise.all(
          phaseIdsToCreate.map((phaseId) =>
            createDefect({
              sheetId,
              poleNumber: 0,
              defectId: selectedDefectId,
              phaseId: phaseId ?? null,
              dateFound,
              inspectorFind: inspector.trim(),
              insulatorCount: insCount,
              spanRange: spanRange.trim(),
              garlandNumber: garlandNum,
              notes: null,
            }).unwrap(),
          ),
        );
        const locationKey = `п:${spanRange.trim()}`;
        setTimeout(() => {
          const wrap = document.querySelector('[data-defect-table-wrap]') as HTMLElement | null;
          const target = wrap?.querySelector(`[data-pole-key="${locationKey}"]`) as HTMLElement | null;
          if (wrap && target) {
            wrap.scrollTo({ top: target.offsetTop - wrap.offsetTop - 8, behavior: 'smooth' });
          } else if (wrap) {
            wrap.scrollTo({ top: 9_999_999, behavior: 'smooth' });
          }
        }, 500);
      }

      handleClearDraft();
      const poleCount = mode === 'pole' ? parsePoleList(poleNumber, poleStart, poleEnd).length : 0;
      if (mode === 'pole' && poleCount > 1) {
        toast.success(`Дефект добавлен на ${poleCount} опор`);
      } else if (phaseIdsToCreate.length > 1) {
        toast.success(`Дефект добавлен для ${phaseIdsToCreate.length} фаз`);
      } else {
        toast.success('Дефект добавлен');
      }
    } catch (err) {
      logger.error('AddDefect failed', err);
      const status = (err as { status?: number })?.status;
      if (status === 409) {
        toast.warning('Такой дефект уже добавлен на эту опору');
      } else {
        toast.error('Ошибка при добавлении дефекта');
      }
    }
  }, [
    handleClearDraft, createDefect, dateFound, inspector, isValid,
    insulatorCount, garlandNumber, poleNumber, poleStart, poleEnd,
    selectedDefectId, selectedPhaseIds, sheetId, spanRange, mode, phases,
  ]);

  const isMultiPole = mode === 'pole' && poleNumber.includes(',');

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

      {/* Переключатель Оп. / Пр. + поле ввода */}
      <div className={cls.locationField}>
        <FormField
          label='Опора / Пролёт'
          htmlFor='add-location'
        >
          <div className={cls.locationRow}>
            <div className={cls.modeToggle}>
              <button
                type='button'
                className={`${cls.modeSegment} ${mode === 'pole' ? cls.modeSegmentActive : ''}`}
                onClick={() => setMode('pole')}
              >Оп.</button>
              <button
                type='button'
                className={`${cls.modeSegment} ${mode === 'span' ? cls.modeSegmentActive : ''}`}
                onClick={() => setMode('span')}
              >Пр.</button>
            </div>
            <div className={cls.stepWrap}>
              <button
                type='button'
                className={cls.stepBtn}
                style={mode !== 'pole' ? { visibility: 'hidden' } : undefined}
                onClick={() => handlePoleStep(-1)}
                tabIndex={-1}
                disabled={isMultiPole}
              >−</button>
              <Input
                id='add-location'
                name='location'
                inputMode='tel'
                placeholder={mode === 'pole' ? `${poleStart}–${poleEnd}` : `1–${maxSpan}`}
                value={mode === 'pole' ? poleNumber : spanRange}
                onChange={mode === 'pole' ? setPoleNumber : setSpanRange}
                invalid={poleInvalid || spanInvalid}
                className={cls.stepInput}
              />
              <button
                type='button'
                className={cls.stepBtn}
                style={mode !== 'pole' ? { visibility: 'hidden' } : undefined}
                onClick={() => handlePoleStep(1)}
                tabIndex={-1}
                disabled={isMultiPole}
              >+</button>
            </div>
          </div>
          {spanInvalid && (
            <span className={cls.fieldError}>
              Макс. пролёт: {maxSpan}
            </span>
          )}
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
