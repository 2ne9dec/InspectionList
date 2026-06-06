import { useCallback, useState } from 'react';
import type { DefectRecord } from '@/entities/DefectRecord';
import { usePatchDefectMasterMutation } from '@/entities/DefectRecord';
import { toast } from '@/shared/lib/toast';
import { logger } from '@/shared/lib/logger';

/**
 * Управляет состоянием модалки «Заключение мастера»:
 * открытие/закрытие, поля формы, сохранение через patchDefectMaster.
 */
export function useJournalEdit(defects: DefectRecord[]) {
  const [patchMaster, { isLoading: saving }] = usePatchDefectMasterMutation();

  const [targetIds,    setTargetIds]    = useState<number[]>([]);
  const [isOpen,       setIsOpen]       = useState(false);
  const [conclusion,   setConclusion]   = useState('');
  const [deadline,     setDeadline]     = useState('');
  const [masterName,   setMasterName]   = useState('');
  const [dateFixed,    setDateFixed]    = useState('');
  const [workVolume,   setWorkVolume]   = useState('');
  const [inspectorFix, setInspectorFix] = useState('');

  const openEdit = useCallback((ids: number[]) => {
    setTargetIds(ids);
    if (ids.length === 1) {
      const d = defects.find((x) => x.id === ids[0]);
      setConclusion(d?.masterConclusion   ?? '');
      setDeadline(d?.resolutionDeadline   ?? '');
      setMasterName(d?.masterName         ?? '');
      setDateFixed(d?.dateFixed           ?? '');
      setWorkVolume(d?.fixWorkVolume      ?? '');
      setInspectorFix(d?.inspectorFix     ?? '');
    } else {
      setConclusion(''); setDeadline(''); setMasterName('');
      setDateFixed(''); setWorkVolume(''); setInspectorFix('');
    }
    setIsOpen(true);
  }, [defects]);

  const closeEdit = useCallback(() => setIsOpen(false), []);

  const handleSave = useCallback(async (onSuccess?: () => void) => {
    try {
      await Promise.all(
        targetIds.map((id) =>
          patchMaster({
            id,
            masterConclusion:   conclusion   || null,
            resolutionDeadline: deadline     || null,
            masterName:         masterName   || null,
            dateFixed:          dateFixed    || null,
            fixWorkVolume:      workVolume   || null,
            inspectorFix:       inspectorFix || null,
          }).unwrap(),
        ),
      );
      setIsOpen(false);
      onSuccess?.();
      toast.success(
        targetIds.length > 1
          ? `Обновлено ${targetIds.length} дефектов`
          : 'Дефект обновлён',
      );
    } catch (err) {
      logger.error('patchDefectMaster failed', err);
      toast.error('Ошибка сохранения');
    }
  }, [targetIds, conclusion, deadline, masterName, dateFixed, workVolume, inspectorFix, patchMaster]);

  return {
    // modal state
    isOpen,
    saving,
    targetIds,
    // form fields
    conclusion,   setConclusion,
    deadline,     setDeadline,
    masterName,   setMasterName,
    dateFixed,    setDateFixed,
    workVolume,   setWorkVolume,
    inspectorFix, setInspectorFix,
    // handlers
    openEdit,
    closeEdit,
    handleSave,
  };
}
