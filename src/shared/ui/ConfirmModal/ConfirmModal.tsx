import { useEffect, useRef } from 'react';
import { Portal } from '@/shared/ui/Portal';
import cls from './ConfirmModal.module.scss';

export type ConfirmVariant = 'danger' | 'primary' | 'warning';

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Заменяет нативный window.confirm:
 * — стилизован под тему,
 * — не блокирует UI-поток,
 * — поддерживает Escape для отмены и Enter для подтверждения,
 * — тестируется без jest.spyOn.
 */
export const ConfirmModal = ({
  isOpen,
  title,
  description,
  confirmLabel = 'Подтвердить',
  cancelLabel  = 'Отмена',
  variant      = 'danger',
  onConfirm,
  onCancel,
}: ConfirmModalProps) => {
  const confirmRef = useRef<HTMLButtonElement>(null);

  // Фокус на кнопку подтверждения при открытии
  useEffect(() => {
    if (isOpen) confirmRef.current?.focus();
  }, [isOpen]);

  // Закрытие по Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <Portal>
      <div
        className={cls.overlay}
        role='presentation'
        onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
      >
        <div
          role='alertdialog'
          aria-modal='true'
          aria-labelledby='confirm-title'
          aria-describedby={description ? 'confirm-desc' : undefined}
          className={cls.dialog}
        >
          <p id='confirm-title' className={cls.title}>{title}</p>
          {description && (
            <p id='confirm-desc' className={cls.description}>{description}</p>
          )}
          <div className={cls.actions}>
            <button type='button' className={cls.cancelBtn} onClick={onCancel}>
              {cancelLabel}
            </button>
            <button
              ref={confirmRef}
              type='button'
              className={`${cls.confirmBtn} ${cls[`confirmBtn--${variant}`]}`}
              onClick={onConfirm}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
};
