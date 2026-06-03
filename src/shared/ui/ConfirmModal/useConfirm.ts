import { useCallback, useState } from 'react';
import type { ConfirmVariant } from './ConfirmModal';

export interface UseConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
}

interface ConfirmState extends UseConfirmOptions {
  resolve: (value: boolean) => void;
}

/**
 * Хук для императивного вызова ConfirmModal без window.confirm.
 *
 * @example
 * const { confirm, confirmProps } = useConfirm();
 *
 * const handleDelete = async () => {
 *   const ok = await confirm({ title: 'Удалить дефект?', variant: 'danger' });
 *   if (!ok) return;
 *   await deleteDefect(id);
 * };
 *
 * return (
 *   <>
 *     <button onClick={handleDelete}>Удалить</button>
 *     <ConfirmModal {...confirmProps} />
 *   </>
 * );
 */
export function useConfirm() {
  const [state, setState] = useState<ConfirmState | null>(null);

  const confirm = useCallback((options: UseConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setState({ ...options, resolve });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    state?.resolve(true);
    setState(null);
  }, [state]);

  const handleCancel = useCallback(() => {
    state?.resolve(false);
    setState(null);
  }, [state]);

  return {
    confirm,
    confirmProps: {
      isOpen:       Boolean(state),
      title:        state?.title        ?? '',
      description:  state?.description,
      confirmLabel: state?.confirmLabel,
      cancelLabel:  state?.cancelLabel,
      variant:      state?.variant,
      onConfirm:    handleConfirm,
      onCancel:     handleCancel,
    },
  };
}
