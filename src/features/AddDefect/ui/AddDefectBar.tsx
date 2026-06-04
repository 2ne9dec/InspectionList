import { memo, useCallback, useMemo, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useCreateDefectMutation, useGetDefectsBySheetQuery } from '@/entities/DefectRecord';
import { useGetDefectTypesQuery, useGetElementsQuery, useGetPhasesQuery } from '@/entities/InspectionLine';
import type { DefectType } from '@/entities/InspectionLine';
import { Button, FormField, HStack, Input, MultiSelect } from '@/shared/ui';
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
} from '../model/selectors';
import { DefectPicker } from './DefectPicker';
import cls from './AddDefectBar.module.scss';

interface AddDefectBarProps {
  sheetId: number;
  poleStart: number;
  poleEnd: number;
}

function getDraftKey(sheetId: number) {
  return `draft_defect_${sheetId}`;
}

export const AddDefectBar = memo(({ sheetId, poleStart, poleEnd }: AddDefectBarProps) => {
  const selectedDefectId = useSelector(selectAddDefectSelectedId);
  const selectedPhaseIds = useSelector(selectAddDefectPhaseIds);
  const poleNumber = useSelector(selectAddDefectPole);
  const inspector = useSelector(selectAddDefectInspector);
  const dateFound = useSelector(selectAddDefectDate);
  const insulatorCount = useSelector(selectAddDefectInsulatorCount);
  const spanRange = useSelector(selectAddDefectSpanRange);

  const {
    selectDefect,
    clearDefectSelection,
    setPhaseIds,
    setPoleNumber,
    setInspector,
    setDateFound,
    setInsulatorCount,
    setSpanRange,
  } = addDefectSlice.useActions();

  const handlePoleChange = useCallback(
    (val: string) => {
      setPoleNumber(val);
      if (val) setSpanRange('');
    },
    [setPoleNumber, setSpanRange],
  );

  const handleSpanChange = useCallback(
    (val: string) => {
      setSpanRange(val);
      if (val) setPoleNumber('');
    },
    [setSpanRange, setPoleNumber],
  );

  const DRAFT_KEY = getDraftKey(sheetId);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (d.defectId) selectDefect(d.defectId);
      if (d.poleNumber) setPoleNumber(String(d.poleNumber));
      if (d.phaseIds) setPhaseIds(d.phaseIds);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [DRAFT_KEY]);

  useEffect(() => {
    try {
      localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          defectId: selectedDefectId,
          poleNumber,
          phaseIds: selectedPhaseIds,
        }),
      );
    } catch {}
  }, [DRAFT_KEY, selectedDefectId, poleNumber, selectedPhaseIds]);

  const handleClearDraft = useCallback(() => {
    localStorage.removeItem(DRAFT_KEY);
    clearDefectSelection();
    setPhaseIds([]);
    // poleNumber и spanRange намеренно не сбрасываем — запоминаем для следующего дефекта
    setInsulatorCount('');
  }, [DRAFT_KEY, clearDefectSelection, setPhaseIds, setInsulatorCount]);

  const { data: elements = [] } = useGetElementsQuery();
  const { data: defectTypes = [] } = useGetDefectTypesQuery();
  const { data: phases = [] } = useGetPhasesQuery();
  const [createDefect, { isLoading }] = useCreateDefectMutation();

  const { data: sheetDefects = [] } = useGetDefectsBySheetQuery(sheetId);
  const topDefects = useMemo(() => {
    const counts: Record<number, number> = {};
    sheetDefects.forEach((d) => {
      counts[d.defectId] = (counts[d.defectId] ?? 0) + 1;
    });
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([id]) => defectTypes.find((dt) => dt.id === Number(id)))
      .filter(Boolean) as typeof defectTypes;
  }, [sheetDefects, defectTypes]);

  const selectedDefect = useMemo(
    () => defectTypes.find((d) => d.id === selectedDefectId),
    [defectTypes, selectedDefectId],
  );
  const selectedElement = useMemo(
    () => elements.find((e) => selectedDefect && e.id === selectedDefect.element_id),
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

  const handleSubmit = useCallback(async () => {
    if (!isValid || !selectedDefectId) return;
    const phaseIdsToCreate = selectedPhaseIds.length > 0 ? selectedPhaseIds : [null];
    const insCount = insulatorCount ? Number(insulatorCount) : null;
    try {
      await Promise.all(
        phaseIdsToCreate.map((phaseId) =>
          createDefect({
            sheetId,
            poleNumber: poleNumber ? poleNum : 0,
            defectId: selectedDefectId,
            phaseId: phaseId ?? null,
            dateFound,
            inspectorFind: inspector.trim(),
            isFixed: false,
            dateFixed: null,
            inspectorFix: null,
            insulatorCount: insCount,
            spanRange: spanRange || null,
          }).unwrap(),
        ),
      );
      handleClearDraft();
      toast.success(
        phaseIdsToCreate.length > 1 ? `Дефект добавлен для ${phaseIdsToCreate.length} фаз` : 'Дефект добавлен',
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
    poleNumber,
    poleNum,
    selectedDefectId,
    selectedPhaseIds,
    sheetId,
    spanRange,
  ]);

  const handlePickDefect = useCallback(
    (defect: DefectType) => selectDefect({ defectId: defect.id, elementId: defect.element_id }),
    [selectDefect],
  );

  return (
    <HStack gap='2' align='end' wrap='wrap' className={cls.bar}>
      <div className={cls.dateField}>
        <FormField label='Дата' htmlFor='add-date'>
          <Input id='add-date' name='dateFound' type='date' value={dateFound}
            onChange={setDateFound} />
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

      <div className={cls.poleField}>
        <FormField label={`Опора (${poleStart}–${poleEnd})`} htmlFor='add-pole'>
          <Input
            id='add-pole'
            name='poleNumber'
            type='number'
            min={poleStart}
            max={poleEnd}
            placeholder={`${poleStart}–${poleEnd}`}
            value={poleNumber}
            onChange={handlePoleChange}
            invalid={!!poleNumber && !isPoleValid}
            disabled={!!spanRange.trim()}
          />
        </FormField>
      </div>

      <div className={cls.poleField}>
        <FormField label='Пролёты' optional htmlFor='add-span-range'>
          <Input
            id='add-span-range'
            name='spanRange'
            placeholder={`${poleStart}–${poleEnd}`}
            value={spanRange}
            onChange={handleSpanChange}
            disabled={!!poleNumber}
          />
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
        <div className={cls.phaseField}>
          <FormField label='Фазы' optional htmlFor='add-phases'>
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

      <div style={{ width: 80 }}>
        <FormField label='Изол.' htmlFor='add-insulator-count'>
          <Input
            id='add-insulator-count'
            name='insulatorCount'
            type='number'
            min={1}
            max={99}
            placeholder='—'
            value={insulatorCount}
            onChange={setInsulatorCount}
          />
        </FormField>
      </div>

      <Button
        variant='primary'
        size='m'
        onClick={handleSubmit}
        disabled={!isValid}
        loading={isLoading}
        style={{ flexShrink: 0 }}
      >
        + Добавить
      </Button>

      {topDefects.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center', flexBasis: '100%' }}>
          <span style={{ fontSize: 11, color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>Быстро:</span>
          {topDefects.map((dt) => {
            const el = elements.find((e) => e.id === dt.element_id);
            return (
              <button
                key={dt.id}
                type='button'
                onClick={() => handlePickDefect(dt)}
                style={{
                  padding: '3px 8px',
                  border: '1px solid var(--color-border,#334155)',
                  borderRadius: 12,
                  fontSize: 11,
                  cursor: 'pointer',
                  background:
                    selectedDefectId === dt.id ? 'var(--color-accent,#3b82f6)' : 'var(--color-bg-secondary,#1e293b)',
                  color: selectedDefectId === dt.id ? '#fff' : 'var(--color-text-primary)',
                  whiteSpace: 'nowrap',
                  transition: 'all .12s',
                }}
                title={`${el?.name ?? ''}: ${dt.name}`}
              >
                {el ? `${el.name.slice(0, 6)}…` : ''} {dt.name.slice(0, 14)}
                {dt.name.length > 14 ? '…' : ''}
              </button>
            );
          })}
        </div>
      )}
    </HStack>
  );
});

AddDefectBar.displayName = 'AddDefectBar';
