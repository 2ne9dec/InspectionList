import { memo } from 'react';
import type { DefectType, Element } from '@/entities/InspectionLine';
import { capitalizeFirst as cap } from '@/shared/lib/helpers';
import cls from './DefectTreePopup.module.scss';
import mcls from './DefectTreeMobile.module.scss';

interface DefectTreeMobileProps {
  elements: ReadonlyArray<Element>;
  defects: ReadonlyArray<DefectType>;
  activeId: number | null;
  step: 'elem' | 'defect';
  activeElemName: string;
  countByElement: Record<number, number>;
  multiSelect: boolean;
  selectedIds?: ReadonlySet<number>;
  onElemTap: (el: Element) => void;
  onBack: () => void;
  onDefectClick: (defect: DefectType) => void;
  onClose: () => void;
}

/** Мобильный bottom-sheet выбора элемента/дефекта. */
export const DefectTreeMobile = memo((props: DefectTreeMobileProps) => {
  const {
    elements,
    defects,
    activeId,
    step,
    activeElemName,
    countByElement,
    multiSelect,
    selectedIds,
    onElemTap,
    onBack,
    onDefectClick,
    onClose,
  } = props;

  return (
    <>
      {step === 'elem' ? (
        <>
          <div className={mcls.sheetHeader}>
            <span className={cls.spacer} />
            <span className={mcls.sheetTitle}>Выберите элемент</span>
            <button type="button" className={mcls.closeBtn} onClick={onClose} aria-label="Закрыть">X</button>
          </div>
          <div className={cls.colList}>
            {elements.map((el) => (
              <button
                key={el.id}
                type="button"
                className={cls.elemItem + (activeId === el.id ? ' ' + cls.active : '')}
                onClick={() => onElemTap(el)}
              >
                <span className={cls.elemName}>{cap(el.name)}</span>
                <span className={cls.elemCount}>{countByElement[el.id] ?? 0}</span>
                <span className={cls.arrow} aria-hidden>&rsaquo;</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className={mcls.sheetHeader}>
            <button type="button" className={mcls.backBtn} onClick={onBack}>
              &lsaquo; Назад
            </button>
            <span className={mcls.sheetTitle}>{activeElemName}</span>
            <button type="button" className={mcls.closeBtn} onClick={onClose} aria-label="Закрыть">X</button>
          </div>
          <div className={cls.colList}>
            {defects.map((defect) => (
              <button
                key={defect.id}
                type="button"
                className={`${cls.defectItem}${multiSelect && selectedIds?.has(defect.id) ? ' ' + cls.active : ''}`}
                onClick={() => onDefectClick(defect)}
              >
                <span className={cls.defectName}>
                  {defect.custom ? 'Вписать свой дефект' : cap(defect.name)}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
});
DefectTreeMobile.displayName = 'DefectTreeMobile';
