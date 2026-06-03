import { memo, useCallback } from 'react';
import type { ReactNode } from 'react';
import { classNames } from '@/shared/lib/classNames/classNames';
import cls from './Tabs.module.scss';

export interface TabItem<V extends string = string> {
  value: V;
  content: ReactNode;
  disabled?: boolean;
}

export interface TabsProps<V extends string = string> {
  tabs: ReadonlyArray<TabItem<V>>;
  value: V;
  onTabClick: (tab: TabItem<V>) => void;
  className?: string;
  /** Размер вкладок. */
  size?: 's' | 'm';
}

function TabsInner<V extends string = string>({
  tabs, value, onTabClick, className, size = 'm',
}: TabsProps<V>) {
  const handle = useCallback(
    (tab: TabItem<V>) => () => {
      if (!tab.disabled) onTabClick(tab);
    },
    [onTabClick],
  );

  return (
    <div className={classNames(cls.Tabs, {}, [className, cls[`size_${size}`]])} role="tablist">
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={tab.disabled}
            onClick={handle(tab)}
            className={classNames(cls.tab, { [cls.active]: active, [cls.disabled]: !!tab.disabled })}
          >
            {tab.content}
          </button>
        );
      })}
    </div>
  );
}

export const Tabs = memo(TabsInner) as typeof TabsInner;
