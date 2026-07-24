import { memo, useCallback, useMemo } from 'react';
import { Button, HStack, SearchInput, Tabs } from '@/shared/ui';
import type { TabItem } from '@/shared/ui';
import type { DefectTab } from '../model/useDefectTable';
import cls from './DefectTableToolbar.module.scss';

interface DefectTableToolbarProps {
  tab: DefectTab;
  onTabChange: (t: DefectTab) => void;
  activeCount: number;
  fixedCount: number;
  search: string;
  onSearchChange: (v: string) => void;
  hasFilters: boolean;
  onClearFilters: () => void;
}

const TAB_LABELS: Record<DefectTab, string> = {
  active: 'Активные',
  fixed: 'Устранённые',
};

export const DefectTableToolbar = memo((props: DefectTableToolbarProps) => {
  const {
    tab, onTabChange, activeCount, fixedCount,
    search, onSearchChange,
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

  return (
    <div className={cls.toolbar}>
      <Tabs tabs={tabItems} value={tab} onTabClick={handleTabClick} />

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
