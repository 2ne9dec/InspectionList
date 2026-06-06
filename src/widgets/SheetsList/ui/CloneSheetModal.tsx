import { memo } from 'react';
import { Button, Input, Modal } from '@/shared/ui';
import type { InspectionSheetFull } from '@/entities/InspectionSheet';
import cls from './SheetModals.module.scss';

interface CloneSheetModalProps {
  isOpen:      boolean;
  target:      InspectionSheetFull | undefined;
  date:        string;
  createdBy:   string;
  loading:     boolean;
  onDateChange:      (v: string) => void;
  onCreatedByChange: (v: string) => void;
  onClose:     () => void;
  onConfirm:   () => void;
}

export const CloneSheetModal = memo(({
  isOpen, target, date, createdBy, loading,
  onDateChange, onCreatedByChange, onClose, onConfirm,
}: CloneSheetModalProps) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    size='s'
    title='Скопировать листок осмотра'
    footer={
      <>
        <Button variant='secondary' size='m' onClick={onClose}>Отмена</Button>
        <Button variant='primary' size='m' onClick={onConfirm}
          disabled={!date || loading} loading={loading}>
          Создать
        </Button>
      </>
    }
  >
    <div className={cls.form}>
      {target && (
        <p className={cls.hint}>
          Пустая копия листка «{target.lineName}». Дефекты не копируются.
        </p>
      )}
      <Input
        label='Дата'
        name='clone-date'
        type='date'
        value={date}
        onChange={onDateChange}
      />
      <Input
        label='Осматривал (Ф.И.О.)'
        name='clone-created-by'
        type='text'
        value={createdBy}
        onChange={onCreatedByChange}
        placeholder='Фамилия И.О.'
        autoComplete='off'
      />
    </div>
  </Modal>
));

CloneSheetModal.displayName = 'CloneSheetModal';
