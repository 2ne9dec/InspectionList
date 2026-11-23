import { memo } from 'react';
import cls from './PoleGroupRow.module.scss';

const MAX_CHIPS = 3;

interface PoleElementChipsProps {
  elements: ReadonlyArray<string>;
}

/** Чипы элементов в свёрнутой строке опоры/пролёта. */
export const PoleElementChips = memo(({ elements }: PoleElementChipsProps) => (
  <span className={cls.chipList}>
    {elements.slice(0, MAX_CHIPS).map((elName) => (
      <span key={elName} className={cls.chip}>
        <span className={cls.chipDot} />
        {elName}
      </span>
    ))}
    {elements.length > MAX_CHIPS && (
      <span className={cls.chipMore}>+{elements.length - MAX_CHIPS} ещё</span>
    )}
  </span>
));

PoleElementChips.displayName = 'PoleElementChips';
