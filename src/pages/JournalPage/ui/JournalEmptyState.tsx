import { memo } from 'react';
import { Button } from '@/shared/ui';
import cls from './JournalEmptyState.module.scss';

interface JournalEmptyStateProps {
  totalCount: number;
  onShowAll: () => void;
}

export const JournalEmptyState = memo(({ totalCount, onShowAll }: JournalEmptyStateProps) => (
  <div className={cls.wrap}>
    <div className={cls.icon} aria-hidden>📋</div>

    <p className={cls.total}>
      Всего дефектов в базе: <strong>{totalCount}</strong>
    </p>

    <p className={cls.hint}>
      Выберите линию для просмотра журнала
    </p>

    <Button variant='primary' size='m' onClick={onShowAll}>
      Показать все
    </Button>

    <ul className={cls.tips}>
      <li>Или введите <strong>элемент / дефект</strong> для поиска по всем линиям</li>
      <li>Фильтр по <strong>классу напряжения</strong> сузит список линий</li>
      <li>Фильтр по <strong>статусу</strong> покажет только обнаруженные или устранённые</li>
    </ul>
  </div>
));

JournalEmptyState.displayName = 'JournalEmptyState';
