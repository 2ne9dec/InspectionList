import { memo, useMemo, useRef, useState } from 'react';
import type { DefectType, Element } from '@/entities/InspectionLine';
import { SEVERITY_LABELS } from '@/entities/InspectionLine';
import { Portal } from '@/shared/ui';
import { useOutsideClick } from '@/shared/lib/hooks';
import { capitalizeFirst as cap } from '@/shared/lib/helpers';
import { useIsMobile } from '@/shared/lib/hooks';
import cls from './DefectTreePopup.module.scss';

interface DefectTreePopupProps {
  elements: ReadonlyArray<Element>;
  defectTypes: ReadonlyArray<DefectType>;
  anchor: { top: number; left: number };
  onSelect: (defect: DefectType) => void;
  onClose: () => void;
  /** Режим множественного выбора — попап не закрывается после клика */
  multiSelect?: boolean;
  /** Выбранные id (только для multiSelect) */
  selectedIds?: ReadonlySet<number>;
  /** Вызывается при изменении выборки (только для multiSelect) */
  onSelectionChange?: (ids: Set<number>) => void;
}

export const DefectTreePopup = memo((props: DefectTreePopupProps) => {
  const {
    elements, defectTypes, anchor,
    onSelect, onClose,
    multiSelect = false, selectedIds, onSelectionChange,
  } = props;

  const isMobile = useIsMobile();

  const sortedElements = useMemo(() => {
    return [...elements].sort((a, b) => {
      if (a.name === 'Дефекты отсутствуют') return -1;
      if (b.name === 'Дефекты отсутствуют') return 1;
      return 0;
    });
  }, [elements]);

  const [activeId, setActiveId] = useState<number | null>(sortedElements[0]?.id ?? null);
  const [rightPos, setRightPos] = useState<{ top: number; left: number } | null>(null);
  const [mobileStep, setMobileStep] = useState<'elem' | 'defect'>('elem');

  const leftRef   = useRef<HTMLDivElement>(null);
  const rightRef  = useRef<HTMLDivElement>(null);
  const mobileRef = useRef<HTMLDivElement>(null);

  const desktopRefs = useMemo(() => [leftRef, rightRef], []);
  const mobileRefs  = useMemo(() => [mobileRef], []);

  useOutsideClick(isMobile ? mobileRefs : desktopRefs, onClose, { enabled: true });

  const filteredDefects = useMemo(
    () => (activeId !== null ? defectTypes.filter((d) => d.elementId === activeId) : []),
    [defectTypes, activeId],
  );

  const countByElement = useMemo(() => {
    const map: Record<number, number> = {};
    for (const d of defectTypes) map[d.elementId] = (map[d.elementId] ?? 0) + 1;
    return map;
  }, [defectTypes]);

  /** Переключить один дефект в множественном выборе */
  const handleToggle = (defect: DefectType) => {
    const next = new Set(selectedIds ?? []);
    if (next.has(defect.id)) { next.delete(defect.id); } else { next.add(defect.id); }
    onSelectionChange?.(next);
  };

  /** Клик по дефекту — единственный / множественный выбор */
  const handleDefectClick = (defect: DefectType) => {
    if (multiSelect) {
      handleToggle(defect);
    } else {
      onSelect(defect);
      onClose();
    }
  };

  const handleElemHover = (el: Element, e: React.MouseEvent<HTMLButtonElement>) => {
    setActiveId(el.id);
    const btnRect   = e.currentTarget.getBoundingClientRect();
    const panelRect = leftRef.current?.getBoundingClientRect();
    if (panelRect) {
      const PANEL_MAX_H = 340; // matches CSS max-height
      const desiredTop  = btnRect.top - btnRect.height;
      const top = Math.max(8, Math.min(desiredTop, window.innerHeight - PANEL_MAX_H - 8));
      setRightPos({ top, left: panelRect.right });
    }
  };

  const handleElemTap = (el: Element) => {
    setActiveId(el.id);
    setMobileStep('defect');
  };

  const activeElemName = useMemo(
    () => cap(sortedElements.find((e) => e.id === activeId)?.name ?? ''),
    [sortedElements, activeId],
  );

  if (isMobile) {
    return (
      <Portal>
        <div className={cls.backdrop} onClick={onClose} />
        <div ref={mobileRef} className={cls.mobileSheet}>
          {mobileStep === 'elem' ? (
            <>
              <div className={cls.sheetHeader}>
                <span className={cls.spacer} />
                <span className={cls.sheetTitle}>Выберите элемент</span>
                <button type="button" className={cls.closeBtn} onClick={onClose} aria-label="Закрыть">X</button>
              </div>
              <div className={cls.colList}>
                {sortedElements.map((el) => (
                  <button
                    key={el.id}
                    type="button"
                    className={cls.elemItem + (activeId === el.id ? ' ' + cls.active : '')}
                    onClick={() => handleElemTap(el)}
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
              <div className={cls.sheetHeader}>
                <button
                  type="button"
                  className={cls.backBtn}
                  onClick={() => setMobileStep('elem')}
                >
                  &lsaquo; Назад
                </button>
                <span className={cls.sheetTitle}>{activeElemName}</span>
                <button type="button" className={cls.closeBtn} onClick={onClose} aria-label="Закрыть">X</button>
              </div>
              <div className={cls.colList}>
                {filteredDefects.map((defect) => (
                  <button
                    key={defect.id}
                    type="button"
                    className={`${cls.defectItem}${multiSelect && selectedIds?.has(defect.id) ? ' ' + cls.defectItemSelected : ''}`}
                    onClick={() => handleDefectClick(defect)}
                  >
                    <span className={cls.bar} data-severity={defect.severity} />
                    <span className={cls.defectName}>{cap(defect.name)}</span>
                    <span className={cls.sev} data-severity={defect.severity}>
                      {SEVERITY_LABELS[defect.severity]}
                    </span>
                    {multiSelect && (
                      <span className={`${cls.check}${selectedIds?.has(defect.id) ? ' ' + cls.checkActive : ''}`} aria-hidden>✓</span>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </Portal>
    );
  }

  return (
    <Portal>
      <div
        ref={leftRef}
        className={cls.elemPanel}
        style={{ top: anchor.top, left: anchor.left }}
      >
        <div className={cls.colHeader}>Элемент</div>
        <div className={cls.colList}>
          {sortedElements.map((el) => (
            <button
              key={el.id}
              type="button"
              className={cls.elemItem + (activeId === el.id ? ' ' + cls.active : '')}
              onMouseEnter={(e) => handleElemHover(el, e)}
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
            {filteredDefects.map((defect) => (
              <button
                key={defect.id}
                type="button"
                className={`${cls.defectItem}${multiSelect && selectedIds?.has(defect.id) ? ' ' + cls.defectItemSelected : ''}`}
                onClick={() => handleDefectClick(defect)}
              >
                <span className={cls.bar} data-severity={defect.severity} />
                <span className={cls.defectName}>{cap(defect.name)}</span>
                <span className={cls.sev} data-severity={defect.severity}>
                  {SEVERITY_LABELS[defect.severity]}
                </span>
                {multiSelect && (
                  <span className={`${cls.check}${selectedIds?.has(defect.id) ? ' ' + cls.checkActive : ''}`} aria-hidden>✓</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </Portal>
  );
});

DefectTreePopup.displayName = 'DefectTreePopup';
