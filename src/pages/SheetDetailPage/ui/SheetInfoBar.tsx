import { memo } from 'react';
import type { InspectionSheetFull } from '@/entities/InspectionSheet';
import { formatDate } from '@/shared/lib/helpers/formatDate';
import { ExportButton } from '@/features/ExportToExcel';
import { Button, ProgressRing } from '@/shared/ui';
import cls from './SheetDetailPage.module.scss';

interface SheetInfoBarProps {
  sheet: InspectionSheetFull;
  fixedPct: number;
  totalCount: number;
  canExport: boolean;
  onToggleTimeline: () => void;
}

function getRingColor(pct: number): string {
  if (pct >= 80) return 'var(--color-success)';
  if (pct >= 40) return 'var(--color-warning)';
  return 'var(--color-error)';
}

/** Верхняя панель листка: линия, филиал, напряжение, опоры, прогресс и экспорт. */
export const SheetInfoBar = memo(({
  sheet,
  fixedPct,
  totalCount,
  canExport,
  onToggleTimeline,
}: SheetInfoBarProps) => (
  <div className={cls.infoBar}>
    <div className={cls.infoText}>
      <span className={cls.lineName}>{sheet.lineName}</span>
      <span className={cls.metaSep}>|</span>
      <span className={cls.metaItem}>{sheet.filialName}</span>
      <span className={cls.metaSep}>|</span>
      <span className={cls.metaItem}>{sheet.voltageName}</span>
      <span className={cls.metaSep}>|</span>
      <span className={cls.metaItem}>
        Опоры {sheet.poleStart}–{sheet.poleEnd} ({sheet.poleCount} шт.)
      </span>
      <span className={cls.metaSep}>|</span>
      <span className={cls.metaItem}>
        {formatDate(sheet.createdDate)} · {sheet.inspectors || sheet.createdBy}
        {sheet.mergedBy ? ` · Объединил: ${sheet.mergedBy}` : ''}
      </span>
    </div>

    {totalCount > 0 && (
      <ProgressRing pct={fixedPct} color={getRingColor(fixedPct)} label='исп.' size={52} />
    )}

    <Button
      variant='secondary'
      size='s'
      onClick={onToggleTimeline}
      title='Лента событий дефектов (Alt+T)'
    >
      Лента
    </Button>

    <div className={cls.spacer} />

    {canExport && <ExportButton sheet={sheet} />}
  </div>
));

SheetInfoBar.displayName = 'SheetInfoBar';
