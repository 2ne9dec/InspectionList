import { memo } from 'react';
import type { ReactNode } from 'react';
import { classNames } from '@/shared/lib/classNames/classNames';
import cls from './ThSort.module.scss';

export type SortDir = 'asc' | 'desc';

export interface ThSortProps {
  label: ReactNode;
  /** Текущее направление. undefined = колонка неактивна (нейтральная стрелка). */
  dir?: SortDir;
  onClick: () => void;
  width?: number | string;
  className?: string;
}

export const ThSort = memo(({ label, dir, onClick, width, className }: ThSortProps) => (
  <th
    className={classNames(cls.th, { [cls.active]: dir !== undefined }, [className])}
    onClick={onClick}
    style={{ width }}
    role="columnheader"
    aria-sort={dir === 'asc' ? 'ascending' : dir === 'desc' ? 'descending' : 'none'}
  >
    <span className={cls.inner}>
      {label}
      <span className={`${cls.arrow} ${dir === undefined ? cls.arrowInactive : ''}`} aria-hidden>
        {dir === 'asc' ? '↑' : dir === 'desc' ? '↓' : '↕'}
      </span>
    </span>
  </th>
));

ThSort.displayName = 'ThSort';
