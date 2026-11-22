import { useCallback } from 'react';
import { useFixDefectMutation } from '@/entities/DefectRecord';
import { toast } from '@/shared/lib/toast';
import { logger } from '@/shared/lib/logger';
import type { FixDefectSchema } from './fixDefectSlice';

interface UseFixDefectSubmitParams {
  fix: FixDefectSchema | undefined;
  isValid: boolean;
  selectedCount: number;
  onDone: () => void;
}

/** Отметка выбранных дефектов как устранённых. */
export function useFixDefectSubmit({
  fix,
  isValid,
  selectedCount,
  onDone,
}: UseFixDefectSubmitParams) {
  const [fixDefect, { isLoading }] = useFixDefectMutation();

  const handleFix = useCallback(async () => {
    if (!isValid || !fix) return;
    try {
      await Promise.all(
        fix.selectedIds.map((id) =>
          fixDefect({
            id,
            dateFixed: fix.dateFixed,
            inspectorFix: fix.inspectorFix.trim(),
            isFixed: true,
          }).unwrap(),
        ),
      );
      onDone();
      toast.success(
        selectedCount === 1
          ? 'Дефект отмечен как устранённый'
          : `Дефектов устранено: ${selectedCount}`,
      );
    } catch (err) {
      logger.error('FixDefect failed', err);
      toast.error('Ошибка при устранении дефектов');
    }
  }, [fix, fixDefect, isValid, onDone, selectedCount]);

  return { handleFix, isLoading };
}
