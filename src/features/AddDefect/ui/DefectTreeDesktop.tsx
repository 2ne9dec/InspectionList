import { memo } from 'react';
import type { DefectType, Element } from '@/entities/InspectionLine';
import { capitalizeFirst as cap } from '@/shared/lib/helpers';
import cls from './DefectTreePopup.module.scss';

interface DefectTreeDesktopProps {
  leftRef: React.RefObject<HTMLDivElement>;
  rightRef: React.RefObject<HTMLDivElement>;
  anchor: { top: number; left: number };
  elements: ReadonlyArray<Element>;
  activeId: number | null;
  countByElement: Record<number, number>;
  rightPos: { top: number; left: number } | null;
  defects: ReadonlyArray<DefectType>;
  multiSelect: boolean;
  selectedIds?: ReadonlySet<number>;
  onElemHover: (el: Element, e: React.MouseEvent<HTMLButtonElement>) => void;
  onDefectClick: (defect: DefectType) => void;
}

/** Две desktop-панели: элементы слева, дефекты справа. */
export const DefectTreeDesktop = memo(({
  leftRef,
  rightRef,
  anchor,
  elements,
  activeId,
  countByElement,
  rightPos,
  defects,
  multiSelect,
  selectedIds,
  onElemHover,
  onDefectClick,
}: DefectTreeDesktopProps) => (
  <>
    <div
      ref={leftRef}
      className={cls.elemPanel}
      style={{ top: anchor.top, left: anchor.left }}
    >
      <div className={cls.colHeader}>Элемент</div>
      <div className={cls.colList}>
        {elements.map((el) => (
          <button
            key={el.id}
            type='button'
            className={cls.elemItem + (activeId === el.id ? ' ' + cls.active : '')}
            onMouseEnter={(e) => onElemHover(el, e)}
          >
            <span className={cls.elemName}>{cap(el.name)}</span>
            <span className={cls.elemCount}>{countByElement[el.id] ?? 0}</span>
            <span className={cls.arrow} aria-hidden>&rsaquo;</span>
          </button>
        ))}
      </div>
    </div>

    {rightPos !== null && activeId !== null && (
      <div
        ref={rightRef}
        className={cls.defectPanel}
        style={{ top: rightPos.top, left: rightPos.left }}
      >
        <div className={cls.colHeader}>Дефект</div>
        <div className={cls.colList}>
          {defects.map((defect) => (
            <button
              key={defect.id}
              type='button'
              className={`${cls.defectItem}${multiSelect && selectedIds?.has(defect.id) ? ' ' + cls.active : ''}`}
              onClick={() => onDefectClick(defect)}
            >
              <span className={cls.defectName}>
                {defect.custom ? 'Вписать свой дефект' : cap(defect.name)}
              </span>
            </button>
          ))}
        </div>
      </div>
    )}
  </>
));

DefectTreeDesktop.displayName = 'DefectTreeDesktop';
