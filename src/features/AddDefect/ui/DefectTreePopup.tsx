import { memo, useMemo, useRef, useState } from 'react';
import type { DefectType, Element } from '@/entities/InspectionLine';
import { SEVERITY_COLORS, SEVERITY_LABELS } from '@/entities/InspectionLine';
import { Portal } from '@/shared/ui';
import { useEscape, useOutsideClick } from '@/shared/lib/hooks';
import cls from './DefectTreePopup.module.scss';

interface DefectTreePopupProps {
  elements: ReadonlyArray<Element>;
  defectTypes: ReadonlyArray<DefectType>;
  /** Позиция кнопки-триггера (для якорения попапа). */
  anchor: { top: number; left: number };
  onSelect: (defect: DefectType) => void;
  onClose: () => void;
}

/**
 * Двухпанельный попап «Элемент → Дефект».
 * Использует общие хуки useOutsideClick + useEscape.
 */
export const DefectTreePopup = memo((props: DefectTreePopupProps) => {
  const { elements, defectTypes, anchor, onSelect, onClose } = props;

  // Спец-маркер «без дефектов» — всегда наверху списка.
  const sortedElements = useMemo(() => {
    return [...elements].sort((a, b) => {
      if (a.name === 'Дефекты отсутствуют') return -1;
      if (b.name === 'Дефекты отсутствуют') return 1;
      return 0;
    });
  }, [elements]);

  const [activeId, setActiveId] = useState<number | null>(sortedElements[0]?.id ?? null);
  const [rightPos, setRightPos] = useState<{ top: number; left: number } | null>(null);

  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  // useMemo — чтобы массив refs не создавался заново каждый рендер
  // (useOutsideClick имеет refs в deps, нестабильный массив → лишние add/remove)
  const outerRefs = useMemo(() => [leftRef, rightRef], []);

  useOutsideClick(outerRefs, onClose, { enabled: true });
  useEscape(onClose);

  const filteredDefects = useMemo(
    () => (activeId !== null ? defectTypes.filter((d) => d.element_id === activeId) : []),
    [defectTypes, activeId],
  );

  const countByElement = useMemo(() => {
    const map: Record<number, number> = {};
    for (const d of defectTypes) map[d.element_id] = (map[d.element_id] ?? 0) + 1;
    return map;
  }, [defectTypes]);

  // При наведении на элемент — правую панель сдвигаем вверх на высоту одной
  // строки, чтобы:
  //   • заголовок «ДЕФЕКТ» оказался ровно на одну позицию выше элемента,
  //   • первый дефект встал на одну линию с подсвеченным элементом.
  // Высоту берём из btnRect — она совпадает с высотой шапки + padding'a.
  const handleElemHover = (el: Element, e: React.MouseEvent<HTMLButtonElement>) => {
    setActiveId(el.id);
    const btnRect = e.currentTarget.getBoundingClientRect();
    const panelRect = leftRef.current?.getBoundingClientRect();
    if (panelRect) {
      setRightPos({
        top: btnRect.top - btnRect.height,
        left: panelRect.right,
      });
    }
  };

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
              className={`${cls.elemItem} ${activeId === el.id ? cls.active : ''}`}
              onMouseEnter={(e) => handleElemHover(el, e)}
            >
              <span className={cls.elemName}>{el.name}</span>
              <span className={cls.elemCount}>{countByElement[el.id] ?? 0}</span>
              <span className={cls.arrow} aria-hidden>›</span>
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
            {filteredDefects.length === 0 ? (
              <div className={cls.hint}>Нет дефектов</div>
            ) : (
              filteredDefects.map((defect) => (
                <button
                  key={defect.id}
                  type="button"
                  className={cls.defectItem}
                  onClick={() => { onSelect(defect); onClose(); }}
                >
                  <span
                    className={cls.bar}
                    style={{ background: SEVERITY_COLORS[defect.severity] }}
                  />
                  <span className={cls.defectName}>{defect.name}</span>
                  <span
                    className={cls.sev}
                    style={{ color: SEVERITY_COLORS[defect.severity] }}
                  >
                    {SEVERITY_LABELS[defect.severity]}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </Portal>
  );
});

DefectTreePopup.displayName = 'DefectTreePopup';
