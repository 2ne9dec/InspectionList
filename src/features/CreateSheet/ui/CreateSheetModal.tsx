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
import { getUserAuthData, getUserFilialId, getUserIsAdmin } from '@/entities/User';
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
  useSelector(getUserAuthData);

  const { closeModal, setVoltageId, setLineId, setCreatedBy, setCreatedDate, setFilialId } =
    createSheetActions.useActions();

  const { data: filials = [] } = useGetFilialsQuery();
  const { data: voltages = [] } = useGetVoltagesQuery();
  const { data: lines = [] } = useGetLinesQuery();
  const { data: voltageFilter = {} } = useGetFilialVoltageFilterQuery();
  const [createSheet, { isLoading }] = useCreateSheetMutation();

  const effectiveFilialId = isAdmin ? adminFilialId : userFilialId;

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
  const lineOptions = useMemo(
    () => filteredLines.map((l) => ({ value: String(l.id), label: l.name })),
    [filteredLines],
  );

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
        {isAdmin ? (
          <FormField label='Филиал' htmlFor='cs-filial' required>
            <SelectMenu
              options={filialOptions}
              value={String(effectiveFilialId ?? '')}
              onChange={(v) => v !== '' && setFilialId(Number(v))}
              placeholder='— выберите филиал —'
            />
          </FormField>
        ) : (
          <div className={cls.filialBadge}>{userFilialName}</div>
        )}

        <FormField label='Напряжение' htmlFor='cs-voltage' required>
          <SelectMenu
            options={voltageOptions}
            value={String(voltageId ?? '')}
            onChange={(v) => setVoltageId(v === '' ? 0 : Number(v))}
            placeholder='— выберите напряжение —'
          />
        </FormField>

        <FormField label='Линия' htmlFor='cs-line' required>
          <SelectMenu
            id='cs-line'
            options={lineOptions}
            value={String(lineId ?? '')}
            onChange={(v) => setLineId(v === '' ? 0 : Number(v))}
            placeholder='— выберите линию —'
          />
        </FormField>

        {selectedLine && (
          <div className={cls.info}>
            Опоры: <strong>{selectedLine.poleRange}</strong> ({selectedLine.poleCount} шт.)
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
