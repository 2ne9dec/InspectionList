import { memo, useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { StateSchema } from '@/app/providers/StoreProvider';
import { useCreateSheetMutation } from '@/entities/InspectionSheet';
import {
  useGetFilialsQuery,
  useGetFilialVoltageFilterQuery,
  useGetLinesQuery,
  useGetVoltagesQuery,
} from '@/entities/InspectionLine';
import { getUserFilialId, getUserIsAdmin } from '@/entities/User';
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

const selectAdminFilialId = (s: StateSchema) => s.createSheet?.filialId ?? null;

export const CreateSheetModal = memo(() => {
  const navigate = useNavigate();

  const isOpen = useSelector(selectCreateSheetIsOpen);
  const voltageId = useSelector(selectCreateSheetVoltageId);
  const lineId = useSelector(selectCreateSheetLineId);
  const createdBy = useSelector(selectCreateSheetCreatedBy);
  const createdDate = useSelector(selectCreateSheetCreatedDate);
  const adminFilialId = useSelector(selectAdminFilialId);

  const userFilialId = useSelector(getUserFilialId);
  const isAdmin = useSelector(getUserIsAdmin);

  const { closeModal, setVoltageId, setLineId, setCreatedBy, setCreatedDate, setFilialId } =
    createSheetActions.useActions();

  const { data: filials = [] } = useGetFilialsQuery();
  const { data: voltages = [], isFetching: voltagesFetching } = useGetVoltagesQuery();
  const { data: lines = [] } = useGetLinesQuery();
  const { data: voltageFilter = {} } = useGetFilialVoltageFilterQuery();
  const [createSheet, { isLoading }] = useCreateSheetMutation();

  // Если admin выбрал филиал вручную — используем его, иначе берём филиал из его JWT профиля.
  const effectiveFilialId = isAdmin ? (adminFilialId ?? userFilialId) : userFilialId;

  const filteredVoltages = useMemo(() => {
    if (!effectiveFilialId) return [];
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

  const isValid = !!effectiveFilialId && !!voltageId && !!lineId && createdBy.trim().length > 0 && !!createdDate;

  const filialOptions = useMemo(
    () => filials.map((f) => ({ value: String(f.id), label: f.name })),
    [filials],
  );
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
    if (!isValid || !effectiveFilialId || !voltageId || !lineId) return;
    try {
      const trimmed = createdBy.trim();
      const newSheet = await createSheet({
        filialId: effectiveFilialId,
        voltageId,
        lineId,
        createdBy: trimmed,
        createdDate,
      }).unwrap();
      closeModal();
      setTimeout(() => navigate(getRouteSheetDetail(String(newSheet.id))), 50);
    } catch (err: unknown) {
      logger.error('CreateSheet failed', err);
      toast.error('Ошибка при создании листка осмотра');
    }
  }, [closeModal, createSheet, createdBy, createdDate, effectiveFilialId, isValid, lineId, navigate, voltageId]);

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
          <Button variant='primary' onClick={handleSubmit} disabled={!isValid} loading={isLoading}>
            Создать
          </Button>
        </>
      }
    >
      <div className={cls.fields}>
        {userFilialId === null ? (
          // Глобальный admin без филиала — показываем дропдаун
          <FormField label='Филиал' htmlFor='cs-filial' required>
            <SelectMenu
              options={filialOptions}
              value={String(effectiveFilialId ?? '')}
              onChange={(v) => v !== '' && setFilialId(Number(v))}
              placeholder='— выберите филиал —'
            />
          </FormField>
        ) : (
          // Пользователь ваприван к филиалу — показываем неизменяемый бейдж
          <div className={cls.filialBadge}>{userFilialName}</div>
        )}

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
