import { memo } from 'react';
import { Button, FormField, Input, Modal, SelectMenu } from '@/shared/ui';
import { useCreateSheetForm } from '../model/useCreateSheetForm';
import cls from './CreateSheetModal.module.scss';

export const CreateSheetModal = memo(() => {
  const {
    isOpen,
    voltageId,
    lineId,
    createdBy,
    createdDate,
    effectiveFilialId,
    userFilialName,
    voltagesFetching,
    voltagesCount,
    voltageOptions,
    lineOptions,
    selectedLine,
    isValid,
    handleSubmit,
    closeModal,
    setVoltageId,
    setLineId,
    setCreatedBy,
    setCreatedDate,
  } = useCreateSheetForm();

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
            id='cs-voltage'
            options={voltageOptions}
            value={String(voltageId ?? '')}
            onChange={(v) => setVoltageId(v === '' ? 0 : Number(v))}
            placeholder={
              !effectiveFilialId
                ? '— сначала выберите филиал —'
                : voltagesFetching && voltagesCount === 0
                  ? 'Загрузка...'
                  : '— выберите напряжение —'
            }
            disabled={!effectiveFilialId || (voltagesFetching && voltagesCount === 0)}
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
            panelWidth='min(720px, calc(100vw - 32px))'
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
          <Input
            id='cs-date'
            name='createdDate'
            type='date'
            value={createdDate}
            onChange={setCreatedDate}
          />
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
