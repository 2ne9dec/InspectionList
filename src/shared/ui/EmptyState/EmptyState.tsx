import { memo } from 'react';
import type { ReactNode } from 'react';
import { classNames } from '@/shared/lib/classNames/classNames';
import cls from './EmptyState.module.scss';

export interface EmptyStateProps {
  title?: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
  /** Компактный вариант (для пустых таблиц). */
  compact?: boolean;
}

/**
 * Универсальный плейсхолдер для пустых списков, пустых результатов поиска,
 * пустых страниц.
 */
export const EmptyState = memo((props: EmptyStateProps) => {
  const { title, description, icon, action, className, compact } = props;
  return (
    <div className={classNames(cls.EmptyState, { [cls.compact]: !!compact }, [className])}>
      {icon && <div className={cls.icon}>{icon}</div>}
      {title && <div className={cls.title}>{title}</div>}
      {description && <div className={cls.description}>{description}</div>}
      {action && <div className={cls.action}>{action}</div>}
    </div>
  );
});

EmptyState.displayName = 'EmptyState';
