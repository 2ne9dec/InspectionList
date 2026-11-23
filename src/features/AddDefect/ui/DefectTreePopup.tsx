import { memo, useMemo, useRef, useState } from 'react';
import type { DefectType, Element } from '@/entities/InspectionLine';
import { Portal } from '@/shared/ui';
import { useOutsideClick } from '@/shared/lib/hooks';
import { capitalizeFirst as cap } from '@/shared/lib/helpers';
import { DefectTreeDesktop } from './DefectTreeDesktop';
import { DefectTreeMobile } from './DefectTreeMobile';
import mcls from './DefectTreeMobile.module.scss';

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

  // Планшет и тачскрин — мобильный UI (hover не работает на таче)
  const isTouchOrNarrow = useMemo(
    () => typeof window !== 'undefined' && (
      window.matchMedia('(max-width: 767px)').matches ||
      window.matchMedia('(pointer: coarse)').matches ||
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0
    ),
    [],
  );

  const sortedElements = useMemo(() => {
    return [...elements].sort((_a, _b) => 0);
  }, [elements]);

  const [activeId, setActiveId] = useState<number | null>(sortedElements[0]?.id ?? null);
  const [rightPos, setRightPos] = useState<{ top: number; left: number } | null>(null);
  const [mobileStep, setMobileStep] = useState<'elem' | 'defect'>('elem');

  const leftRef   = useRef<HTMLDivElement>(null);
  const rightRef  = useRef<HTMLDivElement>(null);
  const mobileRef = useRef<HTMLDivElement>(null);

  const desktopRefs = useMemo(() => [leftRef, rightRef], []);
  // На тачскрине — закрытие через backdrop.onTouchStart (избегаем ghost click)
  useOutsideClick(desktopRefs, onClose, { enabled: !isTouchOrNarrow });

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

  if (isTouchOrNarrow) {
    return (
      <Portal>
        <div
          className={mcls.backdrop}
          onTouchStart={(e) => {
            e.preventDefault(); // блокируем реакцию на реальный тач (не срабатывает на синтетических mouse событиях)
            onClose();
          }}
        />
        <div ref={mobileRef} className={mcls.mobileSheet}>
          <DefectTreeMobile
            elements={sortedElements}
            defects={filteredDefects}
            activeId={activeId}
            step={mobileStep}
            activeElemName={activeElemName}
            countByElement={countByElement}
            multiSelect={multiSelect}
            selectedIds={selectedIds}
            onElemTap={handleElemTap}
            onBack={() => setMobileStep('elem')}
            onDefectClick={handleDefectClick}
            onClose={onClose}
          />
        </div>
      </Portal>
    );
  }

  return (
    <Portal>
      <DefectTreeDesktop
        leftRef={leftRef}
        rightRef={rightRef}
        anchor={anchor}
        elements={sortedElements}
        activeId={activeId}
        countByElement={countByElement}
        rightPos={rightPos}
        defects={filteredDefects}
        multiSelect={multiSelect}
        selectedIds={selectedIds}
        onElemHover={handleElemHover}
        onDefectClick={handleDefectClick}
      />
    </Portal>
  );
});

DefectTreePopup.displayName = 'DefectTreePopup';
