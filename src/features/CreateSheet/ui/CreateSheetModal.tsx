import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  useGetFilialsQuery,
  useGetFilialVoltageFilterQuery,
  useGetLinesQuery,
  useGetVoltagesQuery,
} from '@/entities/InspectionLine';
import { getUserEffectiveFilialId } from '@/entities/User';
import { getRouteSheetDetail } from '@/shared/const/router';
import { Button, FormField, Input, Modal, SelectMenu } from '@/shared/ui';
import { addPendingSheet } from '@/shared/lib/offline/pendingSheets';
import { SYNC_EVENT } from '@/shared/lib/sync/useSyncService';
import { createSheetActions } from '../model/createSheetSlice';
import {
  selectCreateSheetCreatedBy,
  selectCreateSheetCreatedDate,
  selectCreateSheetIsOpen,
  selectCreateSheetLineId,
  selectCreateSheetVoltageId,
} from '../model/selectors';
import cls from './CreateSheetModal.module.scss';

export const CreateSheetModal = memo(() => {
  const navigate = useNavigate();

  const isOpen      = useSelector(selectCreateSheetIsOpen);
  const voltageId   = useSelector(selectCreateSheetVoltageId);
  const lineId      = useSelector(selectCreateSheetLineId);
  const createdBy   = useSelector(selectCreateSheetCreatedBy);
  const createdDate = useSelector(selectCreateSheetCreatedDate);
  // Свой филиал или выбранный в переключателе (главный администратор / наблюдатель РУП)
  const effectiveFilialId = useSelector(getUserEffectiveFilialId);

  const { closeModal, setVoltageId, setLineId, setCreatedBy, setCreatedDate } =
    createSheetActions.useActions();

  const { data: filials  = [] } = useGetFilialsQuery();
  const { data: voltages = [], isFetching: voltagesFetching } = useGetVoltagesQuery();
  const { data: lines    = [] } = useGetLinesQuery();
  const { data: voltageFilter = {} } = useGetFilialVoltageFilterQuery();

  const filteredVoltages = useMemo(() => {
    // Без выбранного филиала не показываем напряжения всех филиалов сразу —
    // иначе в списке появляются дубли «35 кВ», «110 кВ» и т.д.
    if (!effectiveFilialId) return [];
    const allowed = voltageFilter[String(effectiveFilialId)];
    return voltages.filter((v) => v.filialId === effectiveFilialId && (!allowed || allowed.includes(v.id)));
  }, [voltages, effectiveFilialId, voltageFilter]);

  // При смене филиала сбрасываем выбранные напряжение и линию:
  // они принадлежат базе прежнего филиала. На первом рендере не трогаем.
  const prevFilialRef = useRef(effectiveFilialId);
  useEffect(() => {
    if (prevFilialRef.current === effectiveFilialId) return;
    prevFilialRef.current = effectiveFilialId;
    setVoltageId(0);
    setLineId(0);
  }, [effectiveFilialId, setVoltageId, setLineId]);

  const filteredLines = useMemo(
    () => (voltageId ? lines.filter((l) => l.voltageId === voltageId) : []),
    [lines, voltageId],
  );

  const selectedLine = useMemo(
    () => lines.find((l) => l.id === lineId),
    [lines, lineId],
  );

  const isValid = !!effectiveFilialId && !!voltageId && !!lineId
    && createdBy.trim().length > 0 && !!createdDate;

  const voltageOptions = useMemo(
    () => [
      { value: '', label: '— выберите напряжение —' },
      ...filteredVoltages.map((v) => ({ value: String(v.id), label: v.name })),
    ],
    [filteredVoltages],
  );
  const lineOptions = useMemo(() => {
    // Разделяем на главные линии и отпайки (имя содержит " / ")
    const mains    = filteredLines.filter((l) => !l.name.includes(' / '));
    const branches = filteredLines.filter((l) =>  l.name.includes(' / '));

    const result: { value: string; label: string; triggerLabel?: string; indent?: boolean }[] = [];

    for (const main of mains) {
      result.push({ value: String(main.id), label: main.name });
      const prefix = main.name + ' / ';
      for (const br of branches) {
        if (br.name.startsWith(prefix)) {
          result.push({
            value: String(br.id),
            label: br.name.slice(prefix.length),
            triggerLabel: br.name,
            indent: true,
          });
        }
      }
    }

    // Отпайки без родителя — добавляем в конец
    for (const br of branches) {
      if (!result.some((o) => o.value === String(br.id))) {
        result.push({ value: String(br.id), label: br.name, indent: true });
      }
    }

    return result;
  }, [filteredLines]);

  const userFilialName = filials.find((f) => f.id === effectiveFilialId)?.name ?? '';

  const handleSubmit = useCallback(() => {
    const sheetFilialId = effectiveFilialId ?? selectedLine?.filialId ?? null;
    if (!isValid || !voltageId || !lineId || !sheetFilialId) return;

    // Мгновенно сохраняем локально — не ждём сервер
    const pending = addPendingSheet({
      filialId:    sheetFilialId,
      voltageId:   voltageId!,
      lineId:      lineId!,
      createdBy:   createdBy.trim(),
      createdDate,
    });
    closeModal();

    // Фоновая синхронизация — если есть сеть, листок сразу перейдёт на сервер
    window.dispatchEvent(new Event(SYNC_EVENT));

    setTimeout(() => navigate(getRouteSheetDetail(String(pending.localId))), 50);
  }, [closeModal, createdBy, createdDate, effectiveFilialId, isValid, lineId, navigate, selectedLine, voltageId]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeModal}
      title='Новый листок осмотра'
      size='m'
      footer={
        <>
          <Button variant='secondary' onClick={() => closeModal()}>
            Отмена
          </Button>
          <Button variant='primary' onClick={handleSubmit} disabled={!isValid}>
            Создать
          </Button>
        </>
      }
    >
      <div className={cls.fields}>
        {userFilialName && <div className={cls.filialBadge}>{userFilialName}</div>}
        {!effectiveFilialId && (
          <div className={cls.info}>
            Сначала выберите филиал в переключателе в шапке.
          </div>
        )}

        <FormField label='Напряжение' htmlFor='cs-voltage' required>
          <SelectMenu
            options={voltageOptions}
            value={String(voltageId ?? '')}
            onChange={(v) => setVoltageId(v === '' ? 0 : Number(v))}
            placeholder={
              !effectiveFilialId
                ? '— сначала выберите филиал —'
                : voltagesFetching && voltages.length === 0
                  ? 'Загрузка...'
                  : '— выберите напряжение —'
            }
            disabled={!effectiveFilialId || (voltagesFetching && voltages.length === 0)}
          />
        </FormField>

        <FormField label='Линия' htmlFor='cs-line' required>
          <SelectMenu
            id='cs-line'
            options={lineOptions}
            value={String(lineId ?? '')}
            onChange={(v) => setLineId(v === '' ? 0 : Number(v))}
            placeholder={!voltageId ? '— сначала выберите напряжение —' : '— выберите линию —'}
            disabled={!voltageId}
          />
        </FormField>

        {selectedLine && selectedLine.poleCount != null && (
          <div className={cls.info}>
            {selectedLine.poleRange
              ? <>Опоры: <strong>{selectedLine.poleRange}</strong>{' '}</>
              : null}
            ({selectedLine.poleCount} шт.)
          </div>
        )}

        <FormField label='Дата осмотра' htmlFor='cs-date' required>
          <Input id='cs-date' name='createdDate' type='date' value={createdDate}
onChange={setCreatedDate} />
        </FormField>

        <FormField label='Осматривал (ФИО)' htmlFor='cs-inspector' required>
          <Input
            id='cs-inspector'
            name='createdBy'
            value={createdBy}
            placeholder='Иванов И.И.'
            onChange={setCreatedBy}
            onKeyDown={(e) => { if (e.key === 'Enter' && isValid) handleSubmit(); }}
          />
        </FormField>
      </div>
    </Modal>
  );
});

CreateSheetModal.displayName = 'CreateSheetModal';
