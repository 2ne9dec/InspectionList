import { memo, useMemo, useRef, useState } from 'react';
import type { DefectType, Element } from '@/entities/InspectionLine';
import { SEVERITY_LABELS } from '@/entities/InspectionLine';
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
 * На десктопе: две колонки side-by-side с hover-навигацией.
 * На телефоне (< 480px CSS): bottom sheet с пошаговой навигацией (tap).
 */
export const DefectTreePopup = memo((props: DefectTreePopupProps) => {
  const { elements, defectTypes, anchor, onSelect, onClose } = props;

  // Определяем телефонный viewport один раз при монтировании.
  // При изменении ориентации попап закроется сам — повторный открой пересчитает.
  const isMobile = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 479px)').matches,
    [],
  );

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

  // Мобильный: шаг навигации ('elem' → список элементов, 'defect' → список дефектов)
  const [mobileStep, setMobileStep] = useState<'elem' | 'defect'>('elem');

  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const mobileRef = useRef<HTMLDivElement>(null);

  // useMemo — чтобы массив refs не создавался заново каждый рендер
  const desktopRefs = useMemo(() => [leftRef, rightRef], []);
  const mobileRefs  = useMemo(() => [mobileRef], []);

  useOutsideClick(isMobile ? mobileRefs : desktopRefs, onClose, { enabled: true });
  useEscape(onClose);

  const filteredDefects = useMemo(
    () => (activeId !== null ? defectTypes.filter((d) => d.elementId === activeId) : []),
    [defectTypes, activeId],
  );

  const countByElement = useMemo(() => {
    const map: Record<number, number> = {};
    for (const d of defectTypes) map[d.elementId] = (map[d.elementId] ?? 0) + 1;
    return map;
  }, [defectTypes]);

  // Десктоп: при наведении на элемент — правую панель сдвигаем вверх на высоту одной строки
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

  // Мобильный: тап на элемент — переход к дефектам
  const handleElemTap = (el: Element) => {
    setActiveId(el.id);
    setMobileStep('defect');
  };

  const activeElemName = useMemo(
    () => sortedElements.find((e) => e.id === activeId)?.name ?? '',
    [sortedElements, activeId],
  );

  /* ── Mobile bottom sheet ─────────────────────────────────────────── */
  if (isMobile) {
    return (
      <Portal>
        <div className={cls.backdrop} onClick={onClose} />
        <div ref={mobileRef} className={cls.mobileSheet}>
          {mobileStep === 'elem' ? (
            <>
              <div className={cls.sheetHeader}>
                {/* пустой спейсер слева для выравнивания заголовка по центру */}
                <span style={{ minWidth: 64 }} />
                <span className={cls.sheetTitle}>Выберите элемент</span>
                <button type="button" className={cls.closeBtn} onClick={onClose} aria-label="Закрыть">
                  ✕
                </button>
              </div>
              <div className={cls.colList}>
                {sortedElements.map((el) => (
                  <button
                    key={el.id}
                    type="button"
                    className={`${cls.elemItem} ${activeId === el.id ? cls.active : ''}`}
                    onClick={() => handleElemTap(el)}
                  >
                    <span className={cls.elemName}>{el.name}</span>
                    <span className={cls.elemCount}>{countByElement[el.id] ?? 0}</span>
                    <span className={cls.arrow} aria-hidden>›</span>
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
                  ‹ Назад
                </button>
                <span className={cls.sheetTitle}>{activeElemName}</span>
                <button type="button" className={cls.closeBtn} onClick={onClose} aria-label="Закрыть">
                  ✕
                </button>
              </div>
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
                      <span className={cls.bar} data-severity={defect.severity} />
                      <span className={cls.defectName}>{defect.name}</span>
                      <span className={cls.sev} data-severity={defect.severity}>
                        {SEVERITY_LABELS[defect.severity]}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </Portal>
    );
  }

  /* ── Desktop two-panel popup ─────────────────────────────────────── */
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
                    data-severity={defect.severity}
                  />
                  <span className={cls.defectName}>{defect.name}</span>
                  <span
                    className={cls.sev}
                    data-severity={defect.severity}
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
