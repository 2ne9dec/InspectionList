import { memo } from 'react';
import { Button, Input, Modal } from '@/shared/ui';
import type { InspectionSheetFull } from '@/entities/InspectionSheet';
import { formatIsoDate } from '../lib/formatIsoDate';
import cls from './SheetModals.module.scss';

interface MergeSheetModalProps {
  isOpen:        boolean;
  selectedSheets: InspectionSheetFull[];
  date:          string;
  createdBy:     string;
  loading:       boolean;
  onDateChange:      (v: string) => void;
  onCreatedByChange: (v: string) => void;
  onClose:       () => void;
  onConfirm:     () => void;
}

export const MergeSheetModal = memo(({
  isOpen, selectedSheets, date, createdBy, loading,
  onDateChange, onCreatedByChange, onClose, onConfirm,
}: MergeSheetModalProps) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    size='s'
    title='Создать сводный листок'
    footer={
      <>
        <Button variant='secondary' size='m' onClick={onClose}>Отмена</Button>
        <Button variant='danger' size='m' onClick={onConfirm}
          disabled={!date || loading} loading={loading}>
          Объединить и удалить исходные
        </Button>
      </>
    }
  >
    <div className={cls.form}>
      <p className={cls.hint}>Объединяются листки:</p>
      <ul className={cls.sheetList}>
        {selectedSheets.map((s) => (
          <li key={s.id}>{s.lineName} · {formatIsoDate(s.createdDate)} · {s.createdBy}</li>
        ))}
      </ul>
      <p className={cls.danger}>
        Исходные листки и их дефекты будут удалены.
      </p>
      <Input
        label='Дата сводного листка'
        name='merge-date'
        type='date'
        value={date}
        onChange={onDateChange}
      />
      <Input
        label='Составил (Ф.И.О.)'
        name='merge-created-by'
        type='text'
        value={createdBy}
        onChange={onCreatedByChange}
        placeholder='Фамилия И.О.'
        autoComplete='off'
      />
    </div>
  </Modal>
));

MergeSheetModal.displayName = 'MergeSheetModal';
