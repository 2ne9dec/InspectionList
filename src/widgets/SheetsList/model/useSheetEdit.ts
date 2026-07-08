import { useCallback, useState } from 'react';
import { useUpdateSheetMutation } from '@/entities/InspectionSheet';
import type { InspectionSheetFull } from '@/entities/InspectionSheet';
import { toast } from '@/shared/lib/toast';
import { logger } from '@/shared/lib/logger';

export function useSheetEdit(sheets: InspectionSheetFull[]) {
  const [editTargetId, setEditTargetId] = useState<number | null>(null);
  const [editDate,     setEditDate]     = useState('');
  const [editBy,       setEditBy]       = useState('');
  const [updateSheet, { isLoading: updating }] = useUpdateSheetMutation();

  const handleOpenEdit = useCallback((id: number) => {
    const src = sheets.find((s) => s.id === id);
    setEditTargetId(id);
    setEditDate(src?.createdDate ?? '');
    setEditBy(src?.createdBy ?? '');
  }, [sheets]);

  const handleCloseEdit = useCallback(() => {
    setEditTargetId(null);
    setEditDate('');
    setEditBy('');
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editTargetId || !editDate) return;
    try {
      await updateSheet({ id: editTargetId, createdDate: editDate, createdBy: editBy }).unwrap();
      handleCloseEdit();
      toast.success('Листок обновлён');
    } catch (e) {
      logger.error('Update sheet failed', e);
      toast.error('Ошибка при сохранении');
    }
  }, [editTargetId, editDate, editBy, updateSheet, handleCloseEdit]);

  return {
    editTargetId, editDate, editBy, updating,
    handleOpenEdit, handleCloseEdit, handleSaveEdit,
    setEditDate, setEditBy,
  };
}
