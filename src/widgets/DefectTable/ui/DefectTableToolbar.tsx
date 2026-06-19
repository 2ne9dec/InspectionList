import { memo, useCallback, useMemo } from 'react';
import { Button, HStack, SearchInput, Tabs } from '@/shared/ui';
import type { TabItem } from '@/shared/ui';
import type { Severity } from '@/shared/const/severity';
import type { DefectTab } from '../model/useDefectTable';
import cls from './DefectTableToolbar.module.scss';

type SeverityStats = Record<Severity, number>;

interface DefectTableToolbarProps {
  tab: DefectTab;
  onTabChange: (t: DefectTab) => void;
  activeCount: number;
  fixedCount: number;
  severityStats: SeverityStats | null;
  search: string;
  onSearchChange: (v: string) => void;
  hasFilters: boolean;
  onClearFilters: () => void;
}

const SEV_LABEL_SHORT: Record<Severity, string> = {
  critical: 'крит.',
  high:     'выс.',
  medium:   'ср.',
  low:      'низк.',
  ok:       'норм.',
};

const TAB_LABELS: Record<DefectTab, string> = {
  active: 'Активные',
  fixed: 'Устранённые',
};

export const DefectTableToolbar = memo((props: DefectTableToolbarProps) => {
  const {
    tab, onTabChange, activeCount, fixedCount,
    severityStats, search, onSearchChange,
    hasFilters, onClearFilters,
  } = props;

  const tabItems: ReadonlyArray<TabItem<DefectTab>> = useMemo(() => ([
    {
      value: 'active',
      content: (
        <HStack gap='2'>
          <span>{TAB_LABELS.active}</span>
          <span className={`${cls.count} ${cls.countDanger}`}>{activeCount}</span>
        </HStack>
      ),
    },
    {
      value: 'fixed',
      content: (
        <HStack gap='2'>
          <span>{TAB_LABELS.fixed}</span>
          <span className={`${cls.count} ${cls.countSuccess}`}>{fixedCount}</span>
        </HStack>
      ),
    },
  ]), [activeCount, fixedCount]);

  const handleTabClick = useCallback(
    (t: TabItem<DefectTab>) => onTabChange(t.value),
    [onTabChange],
  );

  const severityOrder: ReadonlyArray<Severity> = ['critical', 'high', 'medium', 'low'];

  return (
    <div className={cls.toolbar}>
      <Tabs tabs={tabItems} value={tab} onTabClick={handleTabClick} />

      {severityStats && (
        <div className={cls.stats}>
          {severityOrder.map((sev) =>
            severityStats[sev] > 0 ? (
              <span key={sev} className={cls.stat} data-severity={sev}>
                * {severityStats[sev]} {SEV_LABEL_SHORT[sev]}
              </span>
            ) : null,
          )}
        </div>
      )}

      <div className={cls.filterGroup}>
        {hasFilters && (
          <Button variant="ghost" size="s" onClick={onClearFilters}>
            Сбросить фильтры
          </Button>
        )}
      </div>

      <div className={cls.search}>
        <SearchInput
          id="defect-search"
          name="defectSearch"
          size="s"
          value={search}
          onChange={onSearchChange}
          placeholder="Поиск..."
        />
      </div>
    </div>
  );
});

DefectTableToolbar.displayName = 'DefectTableToolbar';
