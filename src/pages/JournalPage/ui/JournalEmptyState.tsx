import { memo } from 'react';
import { Button } from '@/shared/ui';
import type { StatusFilter } from '../model/useJournalFilters';
import cls from './JournalEmptyState.module.scss';

interface JournalEmptyStateProps {
  filteredCount: number;
  statusFilter:  StatusFilter;
  hasFilters:    boolean;
  lineLabel:     string;
  onShowAll:     () => void;
}

function buildText(
  count: number,
  status: StatusFilter,
  hasFilters: boolean,
  lineLabel: string,
): { headline: string; hint: string } {
  const byLine = lineLabel ? ` по линии «${lineLabel}»` : '';
  if (!hasFilters) {
    return {
      headline: `В базе ${count} записей`,
      hint: 'Выберите фильтры или нажмите «Показать», чтобы загрузить весь журнал',
    };
  }
  if (status === 'active') {
    return {
      headline: `Обнаруженных дефектов${byLine}: ${count}`,
      hint: 'Нажмите «Показать» для отображения результата',
    };
  }
  if (status === 'fixed') {
    return {
      headline: `Устранённых дефектов${byLine}: ${count}`,
      hint: 'Нажмите «Показать» для отображения результата',
    };
  }
  return {
    headline: `Найдено записей${byLine}: ${count}`,
    hint: 'Нажмите «Показать» для отображения результата',
  };
}

export const JournalEmptyState = memo((
  { filteredCount, statusFilter, hasFilters, lineLabel, onShowAll }: JournalEmptyStateProps,
) => {
  const { headline, hint } = buildText(filteredCount, statusFilter, hasFilters, lineLabel);
  return (
    <div className={cls.wrap}>
      <div className={cls.icon} aria-hidden>📋</div>
      <p className={cls.total}>{headline}</p>
      <p className={cls.hint}>{hint}</p>
      <Button variant='primary' size='m' onClick={onShowAll}>
        Показать
      </Button>
    </div>
  );
});

JournalEmptyState.displayName = 'JournalEmptyState';
