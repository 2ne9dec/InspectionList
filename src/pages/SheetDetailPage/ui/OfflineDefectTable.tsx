import { memo } from 'react';
import { useGetDefectTypesQuery, useGetPhasesQuery } from '@/entities/InspectionLine';
import type { PendingDefect } from '@/shared/lib/offline/pendingDefects';
import cls from './SheetDetailPage.module.scss';
import { Table, TableHead, TableBody, TableRow, TableTh, TableTd } from '@/shared/ui';

/** Строка таблицы офлайн-дефекта. */
const OfflineDefectRow = memo(({
  defect,
  defectTypes,
  phases,
  index,
}: {
  defect: PendingDefect;
  defectTypes: ReturnType<typeof useGetDefectTypesQuery>['data'];
  phases: ReturnType<typeof useGetPhasesQuery>['data'];
  index: number;
}) => {
  const dt = (defectTypes ?? []).find((d: { id: number }) => d.id === defect.defectId) as { name: string } | undefined;
  const phase = defect.phaseId ? (phases ?? []).find((p: { id: number; name: string }) => p.id === defect.phaseId) : null;
  const loc = defect.poleNumber > 0
    ? `Оп. ${defect.poleNumber}`
    : `Пр. ${defect.spanRange ?? ''}`;

  return (
    <TableRow className={cls.offlineRow}>
      <TableTd className={`${cls.offlineCell} ${cls.offlineIndex}`}>{index}</TableTd>
      <TableTd className={cls.offlineCell}>{loc}</TableTd>
      <TableTd className={cls.offlineCell}>{defect.customName?.trim() || dt?.name || '—'}</TableTd>
      <TableTd className={`${cls.offlineCell} ${cls.offlineSecondary}`}>
        {phase?.name ?? '—'}
      </TableTd>
      <TableTd className={`${cls.offlineCell} ${cls.offlineSecondary}`}>
        {defect.inspectorFind}
      </TableTd>
    </TableRow>
  );
});
OfflineDefectRow.displayName = 'OfflineDefectRow';

interface OfflineDefectTableProps {
  defects: ReadonlyArray<PendingDefect>;
}

/** Таблица ещё не синхронизированных дефектов офлайн-листка. */
export const OfflineDefectTable = memo(({ defects }: OfflineDefectTableProps) => {
  const { data: defectTypes } = useGetDefectTypesQuery();
  const { data: phases } = useGetPhasesQuery();

  if (defects.length === 0) {
    return <p className={cls.offlineEmpty}>Дефектов пока нет</p>;
  }

  return (
    <Table className={cls.offlineTable}>
      <TableHead>
        <TableRow className={cls.offlineHeadRow}>
          <TableTh className={cls.offlineTh}>#</TableTh>
          <TableTh className={cls.offlineTh}>Место</TableTh>
          <TableTh className={cls.offlineTh}>Дефект</TableTh>
          <TableTh className={cls.offlineTh}>Фаза</TableTh>
          <TableTh className={cls.offlineTh}>Обнаружил</TableTh>
        </TableRow>
      </TableHead>
      <TableBody>
        {defects.map((d, i) => (
          <OfflineDefectRow
            key={d.localId}
            defect={d}
            defectTypes={defectTypes}
            phases={phases}
            index={i + 1}
          />
        ))}
      </TableBody>
    </Table>
  );
});

OfflineDefectTable.displayName = 'OfflineDefectTable';
