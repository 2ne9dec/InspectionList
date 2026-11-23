import { useCallback } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import { getRouteSheetDetail } from '@/shared/const/router';
import { toast } from '@/shared/lib/toast';
import { logger } from '@/shared/lib/logger';
import { removePendingSheet } from '@/shared/lib/offline/pendingSheets';
import { removePendingDefectsForSheet } from '@/shared/lib/offline/pendingDefects';
import type { useSheetMerge } from './useSheetMerge';
import type { useSheetClone } from './useSheetClone';
import type { useSheetEdit } from './useSheetEdit';

interface UseSheetActionsParams {
  navigate: NavigateFunction;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  deleteSheet: (id: number) => Promise<unknown>;
  merge: ReturnType<typeof useSheetMerge>;
  clone: ReturnType<typeof useSheetClone>;
  edit: ReturnType<typeof useSheetEdit>;
}

/** Открытие, удаление, клонирование и редактирование листков. */
export function useSheetActions({
  navigate,
  canCreate,
  canEdit,
  canDelete,
  deleteSheet,
  merge,
  clone,
  edit,
}: UseSheetActionsParams) {
  const handleOpen = useCallback(
    (id: number) => navigate(getRouteSheetDetail(String(id))),
    [navigate],
  );

  const handleDelete = useCallback(async (id: number) => {
    // Офлайн-листок — удаляем только из localStorage.
    if (id < 0) {
      const ok = await merge.confirm({
        title: 'Удалить офлайн-листок?',
        description: 'Листок не был синхронизирован с сервером.',
        variant: 'danger',
      });
      if (ok) {
        removePendingSheet(id);
        removePendingDefectsForSheet(id);
        toast.success('Офлайн-листок удалён');
      }
      return;
    }

    if (!canDelete) return;

    const ok = await merge.confirm({
      title: 'Удалить листок осмотра?',
      description: 'Все дефекты будут удалены. Это действие необратимо.',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      await deleteSheet(id);
      merge.removeFromSelection(id);
      toast.success('Листок осмотра удалён');
    } catch (e) {
      logger.error('Delete sheet failed', e);
      toast.error('Ошибка при удалении листка осмотра');
    }
  }, [canDelete, deleteSheet, merge]);

  const handleClone = useCallback((id: number) => {
    if (id < 0 || !canCreate) return;
    clone.handleOpenClone(id);
  }, [canCreate, clone]);

  const handleEdit = useCallback((id: number) => {
    if (id < 0 || !canEdit) return;
    edit.handleOpenEdit(id);
  }, [canEdit, edit]);

  return { handleOpen, handleDelete, handleClone, handleEdit };
}
