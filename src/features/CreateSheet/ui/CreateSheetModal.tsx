import { memo, useCallback, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useCreateSheetMutation } from '@/entities/InspectionSheet';
import {
  useGetFilialsQuery,
  useGetFilialVoltageFilterQuery,
  useGetLinesQuery,
  useGetVoltagesQuery,
} from '@/entities/InspectionLine';
import { getUserFilialId } from '@/entities/User';
import { getRouteSheetDetail } from '@/shared/const/router';
import { Button, FormField, Input, Modal, SelectMenu } from '@/shared/ui';
import { toast } from '@/shared/lib/toast';
import { logger } from '@/shared/lib/logger';
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

  const isOpen = useSelector(selectCreateSheetIsOpen);
  const voltageId = useSelector(selectCreateSheetVoltageId);
  const lineId = useSelector(selectCreateSheetLineId);
  const createdBy = useSelector(selectCreateSheetCreatedBy);
  const createdDate = useSelector(selectCreateSheetCreatedDate);
  const userFilialId = useSelector(getUserFilialId);

  const { closeModal, setVoltageId, setLineId, setCreatedBy, setCreatedDate } =
    createSheetActions.useActions();

  const { data: filials = [] } = useGetFilialsQuery();
  const { data: voltages = [], isFetching: voltagesFetching } = useGetVoltagesQuery();
  const { data: lines = [] } = useGetLinesQuery();
  const { data: voltageFilter = {} } = useGetFilialVoltageFilterQuery();
  const [createSheet] = useCreateSheetMutation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const effectiveFilialId = userFilialId;

  const filteredVoltages = useMemo(() => {
    if (!effectiveFilialId) return voltages;
    const allowed = voltageFilter[String(effectiveFilialId)];
    return voltages.filter((v) => v.filialId === effectiveFilialId && (!allowed || allowed.includes(v.id)));
  }, [voltages, effectiveFilialId, voltageFilter]);

  const filteredLines = useMemo(
    () => (voltageId ? lines.filter((l) => l.voltageId === voltageId) : []),
    [lines, voltageId],
  );

  const selectedLine = useMemo(
    () => lines.find((l) => l.id === lineId),
    [lines, lineId],
  );

  const isValid = !!voltageId && !!lineId && createdBy.trim().length > 0 && !!createdDate;

  const voltageOptions = useMemo(
    () => [
      { value: '', label: '— выберите напряжение —' },
      ...filteredVoltages.map((v) => ({ value: String(v.id), label: v.name })),
    ],
    [filteredVoltages],
  );
  const lineOptions = useMemo(() => {
    // Разделяем на главные линии и отпайки (имя содержит " / ")
    const mains   = filteredLines.filter((l) => !l.name.includes(' / '));
    const branches = filteredLines.filter((l) => l.name.includes(' / '));

    const result: { value: string; label: string; triggerLabel?: string; indent?: boolean }[] = [];

    for (const main of mains) {
      result.push({ value: String(main.id), label: main.name });
      // Отпайки этой линии: имя начинается с "Имя главной / ..."
      const prefix = main.name + ' / ';
      for (const br of branches) {
        if (br.name.startsWith(prefix)) {
          // В списке показываем только часть после " / ", в триггере — полное имя
          result.push({
            value: String(br.id),
            label: br.name.slice(prefix.length),
            triggerLabel: br.name,
            indent: true,
          });
        }
      }
    }

    // Отпайки без родителя (если главной нет в текущем наборе) — добавляем в конец
    for (const br of branches) {
      if (!result.some((o) => o.value === String(br.id))) {
        result.push({ value: String(br.id), label: br.name, indent: true });
      }
    }

    return result;
  }, [filteredLines]);

  const userFilialName = filials.find((f) => f.id === userFilialId)?.name ?? '';

  const handleSubmit = useCallback(async () => {
    const sheetFilialId = effectiveFilialId ?? selectedLine?.filialId ?? null;
    if (!isValid || !voltageId || !lineId || !sheetFilialId) return;
    setIsSubmitting(true);
    try {
      const trimmed = createdBy.trim();
      // Таймаут 15 сек: если сервер не отвечает, показываем ошибку вместо бесконечнй крутилки
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Сервер не отвечает (проверьте F12 → Network)')), 15_000)
      );
      const newSheet = await Promise.race([
        createSheet({ filialId: sheetFilialId, voltageId, lineId, createdBy: trimmed, createdDate }).unwrap(),
        timeout,
      ]);
      closeModal();
      setTimeout(() => navigate(getRouteSheetDetail(String(newSheet.id))), 50);
    } catch (err: unknown) {
      logger.error('CreateSheet failed', err);
      const errData = (err as { data?: { error?: string } })?.data?.error;
      const errMsg  = errData ?? (err instanceof Error ? err.message : 'Неизвестная ошибка');
      toast.error(`Ошибка: ${errMsg}`);
    } finally {
      setIsSubmitting(false);
    }
  }, [closeModal, createSheet, createdBy, createdDate, effectiveFilialId, isValid, lineId, navigate, selectedLine, voltageId]);

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
          <Button variant='primary' onClick={handleSubmit} disabled={!isValid} loading={isSubmitting}>
            Создать
          </Button>
        </>
      }
    >
      <div className={cls.fields}>
        <div className={cls.filialBadge}>{userFilialName}</div>

        <FormField label='Напряжение' htmlFor='cs-voltage' required>
          <SelectMenu
            options={voltageOptions}
            value={String(voltageId ?? '')}
            onChange={(v) => setVoltageId(v === '' ? 0 : Number(v))}
            placeholder={voltagesFetching && voltages.length === 0 ? 'Загрузка...' : '— выберите напряжение —'}
            disabled={voltagesFetching && voltages.length === 0}
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
