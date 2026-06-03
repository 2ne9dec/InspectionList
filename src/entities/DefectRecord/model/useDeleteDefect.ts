import { useCallback } from 'react';
import { useConfirm } from '@/shared/ui';
import { toast } from '@/shared/lib/toast';
import { logger } from '@/shared/lib/logger';
import { useDeleteDefectMutation } from '../api/defectsApi';

/**
 * Инкапсулирует логику удаления дефекта:
 *  — confirm-диалог → DELETE-запрос → toast
 * Возвращает handleDelete (id → Promise<boolean>) и confirmProps для рендера ConfirmModal.
 * Используется в useDefectTable (удаление из таблицы) и SheetDetailPage (удаление из сайдбара).
 */
export function useDeleteDefect() {
  const [deleteDefect] = useDeleteDefectMutation();
  const { confirm, confirmProps } = useConfirm();

  const handleDelete = useCallback(
    async (id: number): Promise<boolean> => {
      const ok = await confirm({
        title: 'Удалить дефект?',
        description: 'Это действие необратимо.',
        variant: 'danger',
      });
      if (!ok) return false;
      try {
        await deleteDefect(id).unwrap();
        toast.success('Дефект удалён');
        return true;
      } catch (err) {
        logger.error('Delete defect failed', err);
        toast.error('Ошибка при удалении дефекта');
        return false;
      }
    },
    [confirm, deleteDefect],
  );

  return { handleDelete, confirmProps, confirm };
}
