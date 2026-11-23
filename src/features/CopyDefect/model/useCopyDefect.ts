import { useCallback } from 'react';
import { useCreateDefectMutation } from '@/entities/DefectRecord';
import type { DefectRecord } from '@/entities/DefectRecord';
import { toast } from '@/shared/lib/toast';
import { logger } from '@/shared/lib/logger';

interface UseCopyDefectParams {
  sheetId: number;
  sourceDefects: DefectRecord[];
  allDefects: DefectRecord[];
  selectedIds: number[];
  targetPoles: number[];
  enabled: boolean;
  onDone: () => void;
}

/** Копирование выбранных дефектов на целевые опоры. */
export function useCopyDefect({
  sheetId,
  sourceDefects,
  allDefects,
  selectedIds,
  targetPoles,
  enabled,
  onDone,
}: UseCopyDefectParams) {
  const [createDefect, { isLoading }] = useCreateDefectMutation();

  const handleCopy = useCallback(async () => {
    if (!enabled) return;
    const defectsToCopy = sourceDefects.filter((d) => selectedIds.includes(d.id));

    let created = 0;
    let skipped = 0;

    try {
      for (const pole of targetPoles) {
        const newDefects = defectsToCopy.filter((d) => {
          const exists = allDefects.some(
            (ex) => ex.poleNumber === pole
              && ex.defectId === d.defectId
              && ex.phaseId === d.phaseId
              && (ex.customName ?? null) === (d.customName ?? null),
          );
          if (exists) {
            skipped += 1;
            return false;
          }
          return true;
        });

        if (newDefects.length > 0) {
          await Promise.all(
            newDefects.map((d) =>
              createDefect({
                sheetId,
                poleNumber: pole,
                defectId: d.defectId,
                phaseId: d.phaseId,
                dateFound: d.dateFound,
                inspectorFind: d.inspectorFind,
                insulatorCount: d.insulatorCount ?? null,
                garlandNumber: d.garlandNumber ?? null,
                customName: d.customName ?? null,
              }).unwrap(),
            ),
          );
          created += newDefects.length;
        }
      }

      onDone();

      if (created > 0 && skipped > 0) {
        toast.success(`Скопировано: ${created} деф. Пропущено (уже есть): ${skipped}`);
      } else if (created > 0) {
        toast.success(`Скопировано: ${created} деф. × ${targetPoles.length} оп.`);
      } else {
        toast.info('Все выбранные дефекты уже есть на целевых опорах — ничего не добавлено');
      }
    } catch (err) {
      logger.error('CopyDefect failed', err);
      toast.error('Ошибка при копировании дефектов');
    }
  }, [allDefects, createDefect, enabled, onDone, selectedIds, sheetId, sourceDefects, targetPoles]);

  return { handleCopy, isLoading };
}
