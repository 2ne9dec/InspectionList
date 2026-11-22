import { memo } from 'react';
import { Button, FormField, Input, Modal, VStack } from '@/shared/ui';

interface EditSheetModalProps {
  isOpen: boolean;
  date: string;
  createdBy: string;
  updating: boolean;
  onDateChange: (value: string) => void;
  onCreatedByChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
}

/** Редактирование даты и автора листка осмотра. */
export const EditSheetModal = memo(({
  isOpen,
  date,
  createdBy,
  updating,
  onDateChange,
  onCreatedByChange,
  onClose,
  onSave,
}: EditSheetModalProps) => (
  <Modal
    isOpen={isOpen}
    title='Редактировать листок'
    onClose={onClose}
    footer={
      <>
        <Button variant='ghost' size='s' onClick={onClose}>Отмена</Button>
        <Button variant='primary' size='s' loading={updating} onClick={onSave}>Сохранить</Button>
      </>
    }
  >
    <VStack gap='3'>
      <FormField label='Дата осмотра' htmlFor='edit-date'>
        <Input id='edit-date' type='date' value={date} onChange={onDateChange} />
      </FormField>
      <FormField label='Осматривал' htmlFor='edit-by'>
        <Input id='edit-by' value={createdBy} onChange={onCreatedByChange} placeholder='Фамилия И.О.' />
      </FormField>
    </VStack>
  </Modal>
));

EditSheetModal.displayName = 'EditSheetModal';
