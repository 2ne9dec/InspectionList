import { memo } from 'react';
import { PoleGroupRow } from '@/entities/DefectRecord';
import type { DefectRecordFull } from '@/entities/DefectRecord';
import { TableBody } from '@/shared/ui';

interface DefectTableBodyProps {
  /** Видимые группы «место → дефекты». */
  groups: Array<[string, DefectRecordFull[]]>;
  expandedPoles: Set<string>;
  isFixed: boolean;
  onToggle: (key: string) => void;
  onFix: (key: string) => void;
  onFixOne: (defectId: number) => void;
  onCopy: (key: string) => void;
  onDelete: (id: number) => void;
  onDeleteAll: (ids: number[]) => void;
  onEdit?: (defect: DefectRecordFull) => void;
  onRowClick?: (defect: DefectRecordFull) => void;
  canFix: boolean;
  canCopy: boolean;
  canDelete: boolean;
  canEdit: boolean;
}

/** Тело таблицы дефектов: строки опор/пролётов с непрерывной нумерацией дефектов. */
export const DefectTableBody = memo(({
  groups,
  expandedPoles,
  isFixed,
  onToggle,
  onFix,
  onFixOne,
  onCopy,
  onDelete,
  onDeleteAll,
  onEdit,
  onRowClick,
  canFix,
  canCopy,
  canDelete,
  canEdit,
}: DefectTableBodyProps) => {
  let defectOffset = 0;

  return (
    <TableBody>
      {groups.map(([locationKey, records], idx) => {
        const defectStartIndex = defectOffset;
        defectOffset += records.length;

        return (
          <PoleGroupRow
            key={locationKey}
            locationKey={locationKey}
            index={idx + 1}
            defectStartIndex={defectStartIndex}
            records={records}
            isExpanded={expandedPoles.has(locationKey)}
            isFixed={isFixed}
            onToggle={onToggle}
            onFix={onFix}
            onFixOne={onFixOne}
            onCopy={onCopy}
            onDelete={onDelete}
            onDeleteAll={onDeleteAll}
            onEdit={onEdit}
            onRowClick={onRowClick}
            canFix={canFix}
            canCopy={canCopy}
            canDelete={canDelete}
            canEdit={canEdit}
          />
        );
      })}
    </TableBody>
  );
});

DefectTableBody.displayName = 'DefectTableBody';
