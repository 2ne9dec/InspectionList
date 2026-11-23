import { memo } from 'react';
import { Button, Input, Modal } from '@/shared/ui';
import type { InspectionSheetFull } from '@/entities/InspectionSheet';
import { formatDate } from '@/shared/lib/helpers';
import cls from './SheetModals.module.scss';

interface MergeSheetModalProps {
  isOpen:        boolean;
  selectedSheets: InspectionSheetFull[];
  date:          string;
  mergedBy:      string;
  loading:       boolean;
  onDateChange:      (v: string) => void;
  onMergedByChange:  (v: string) => void;
  onClose:       () => void;
  onConfirm:     () => void;
}

export const MergeSheetModal = memo(({
  isOpen, selectedSheets, date, mergedBy, loading,
  onDateChange, onMergedByChange, onClose, onConfirm,
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
          <li key={s.id}>{s.lineName} · {formatDate(s.createdDate, '')} · {s.inspectors ?? s.createdBy}</li>
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
        label='Объединил (Ф.И.О.)'
        name='merge-merged-by'
        type='text'
        value={mergedBy}
        onChange={onMergedByChange}
        placeholder='Кто объединил'
        autoComplete='off'
      />
    </div>
  </Modal>
));

MergeSheetModal.displayName = 'MergeSheetModal';
