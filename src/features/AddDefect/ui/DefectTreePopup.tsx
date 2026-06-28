import { memo, useEffect, useMemo, useRef, useState } from 'react';
import type { DefectType, Element } from '@/entities/InspectionLine';
import { SEVERITY_LABELS } from '@/entities/InspectionLine';
import { Portal } from '@/shared/ui';
import { useOutsideClick } from '@/shared/lib/hooks';
import { capitalizeFirst as cap } from '@/shared/lib/helpers';
import cls from './DefectTreePopup.module.scss';

interface DefectTreePopupProps {
  elements: ReadonlyArray<Element>;
  defectTypes: ReadonlyArray<DefectType>;
  anchor: { top: number; left: number };
  onSelect: (defect: DefectType) => void;
  onClose: () => void;
}

export const DefectTreePopup = memo((props: DefectTreePopupProps) => {
  const { elements, defectTypes, anchor, onSelect, onClose } = props;

  const isMobile = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 479px)').matches,
    [],
  );

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
  const [elemQuery, setElemQuery] = useState('');
  const [defectQuery, setDefectQuery] = useState('');

  const leftRef         = useRef<HTMLDivElement>(null);
  const rightRef        = useRef<HTMLDivElement>(null);
  const mobileRef       = useRef<HTMLDivElement>(null);
  const elemSearchRef   = useRef<HTMLInputElement>(null);
  const defectSearchRef = useRef<HTMLInputElement>(null);

  const desktopRefs = useMemo(() => [leftRef, rightRef], []);
  const mobileRefs  = useMemo(() => [mobileRef], []);

  useOutsideClick(isMobile ? mobileRefs : desktopRefs, onClose, { enabled: true });

  useEffect(() => {
    if (!isMobile) setTimeout(() => elemSearchRef.current?.focus(), 50);
  }, [isMobile]);

  useEffect(() => {
    if (isMobile && mobileStep === 'defect') setTimeout(() => defectSearchRef.current?.focus(), 50);
  }, [isMobile, mobileStep]);

  const displayedElements = useMemo(() => {
    const q = elemQuery.trim().toLowerCase();
    if (!q) return sortedElements;
    return sortedElements.filter((e) => e.name.toLowerCase().includes(q));
  }, [sortedElements, elemQuery]);

  const filteredDefects = useMemo(
    () => (activeId !== null ? defectTypes.filter((d) => d.elementId === activeId) : []),
    [defectTypes, activeId],
  );

  const displayedDefects = useMemo(() => {
    const q = defectQuery.trim().toLowerCase();
    if (!q) return filteredDefects;
    return filteredDefects.filter((d) => d.name.toLowerCase().includes(q));
  }, [filteredDefects, defectQuery]);

  const countByElement = useMemo(() => {
    const map: Record<number, number> = {};
    for (const d of defectTypes) map[d.elementId] = (map[d.elementId] ?? 0) + 1;
    return map;
  }, [defectTypes]);

  const handleElemHover = (el: Element, e: React.MouseEvent<HTMLButtonElement>) => {
    setActiveId(el.id);
    setDefectQuery('');
    const btnRect   = e.currentTarget.getBoundingClientRect();
    const panelRect = leftRef.current?.getBoundingClientRect();
    if (panelRect) {
      setRightPos({ top: btnRect.top - btnRect.height, left: panelRect.right });
    }
  };

  const handleElemTap = (el: Element) => {
    setActiveId(el.id);
    setDefectQuery('');
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
              <div className={cls.searchRow}>
                <input
                  ref={elemSearchRef}
                  className={cls.searchInput}
                  type="text"
                  placeholder="Поиск элемента..."
                  value={elemQuery}
                  onChange={(e) => setElemQuery(e.target.value)}
                />
              </div>
              <div className={cls.colList}>
                {displayedElements.length === 0 ? (
                  <div className={cls.hint}>Ничего не найдено</div>
                ) : displayedElements.map((el) => (
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
                  onClick={() => { setMobileStep('elem'); setDefectQuery(''); }}
                >
                  &lsaquo; Назад
                </button>
                <span className={cls.sheetTitle}>{activeElemName}</span>
                <button type="button" className={cls.closeBtn} onClick={onClose} aria-label="Закрыть">X</button>
              </div>
              <div className={cls.searchRow}>
                <input
                  ref={defectSearchRef}
                  className={cls.searchInput}
                  type="text"
                  placeholder="Поиск дефекта..."
                  value={defectQuery}
                  onChange={(e) => setDefectQuery(e.target.value)}
                />
              </div>
              <div className={cls.colList}>
                {displayedDefects.length === 0 ? (
                  <div className={cls.hint}>Ничего не найдено</div>
                ) : displayedDefects.map((defect) => (
                  <button
                    key={defect.id}
                    type="button"
                    className={cls.defectItem}
                    onClick={() => { onSelect(defect); onClose(); }}
                  >
                    <span className={cls.bar} data-severity={defect.severity} />
                    <span className={cls.defectName}>{cap(defect.name)}</span>
                    <span className={cls.sev} data-severity={defect.severity}>
                      {SEVERITY_LABELS[defect.severity]}
                    </span>
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
        <div className={cls.searchRow}>
          <input
            ref={elemSearchRef}
            className={cls.searchInput}
            type="text"
            placeholder="Поиск..."
            value={elemQuery}
            onChange={(e) => setElemQuery(e.target.value)}
          />
        </div>
        <div className={cls.colList}>
          {displayedElements.length === 0 ? (
            <div className={cls.hint}>Ничего не найдено</div>
          ) : displayedElements.map((el) => (
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
          <div className={cls.searchRow}>
            <input
              ref={defectSearchRef}
              className={cls.searchInput}
              type="text"
              placeholder="Поиск..."
              value={defectQuery}
              onChange={(e) => setDefectQuery(e.target.value)}
            />
          </div>
          <div className={cls.colList}>
            {displayedDefects.length === 0 ? (
              <div className={cls.hint}>Ничего не найдено</div>
            ) : displayedDefects.map((defect) => (
              <button
                key={defect.id}
                type="button"
                className={cls.defectItem}
                onClick={() => { onSelect(defect); onClose(); }}
              >
                <span className={cls.bar} data-severity={defect.severity} />
                <span className={cls.defectName}>{cap(defect.name)}</span>
                <span className={cls.sev} data-severity={defect.severity}>
                  {SEVERITY_LABELS[defect.severity]}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </Portal>
  );
});

DefectTreePopup.displayName = 'DefectTreePopup';
