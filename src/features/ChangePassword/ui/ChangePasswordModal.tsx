import { memo } from 'react';
import { Modal } from '@/shared/ui';
import { ChangePasswordForm } from './ChangePasswordForm';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/** Добровольная смена своего пароля (из меню пользователя). */
export const ChangePasswordModal = memo(({ isOpen, onClose }: ChangePasswordModalProps) => (
  <Modal isOpen={isOpen} onClose={onClose} title='Смена пароля'>
    <ChangePasswordForm onDone={onClose} onCancel={onClose} />
  </Modal>
));

ChangePasswordModal.displayName = 'ChangePasswordModal';
