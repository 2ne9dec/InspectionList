import { memo, useCallback, useImperativeHandle, useRef, useState, forwardRef } from 'react';
import type { DefectType, Element } from '@/entities/InspectionLine';
import { SEVERITY_COLORS, SEVERITY_LABELS } from '@/entities/InspectionLine';
import { DefectTreePopup } from './DefectTreePopup';
import cls from './DefectPicker.module.scss';

export interface DefectPickerProps {
  elements: ReadonlyArray<Element>;
  defectTypes: ReadonlyArray<DefectType>;
  selectedDefect: DefectType | undefined;
  selectedElement: Element | undefined;
  onSelect: (defect: DefectType) => void;
  onClear: () => void;
}

export interface DefectPickerHandle {
  focus: () => void;
}

/**
 * Поле выбора «Элемент → Дефект».
 * Управляет состоянием open + позиционированием попапа.
 */
export const DefectPicker = memo(forwardRef<DefectPickerHandle, DefectPickerProps>((props, ref) => {
  const { elements, defectTypes, selectedDefect, selectedElement, onSelect, onClear } = props;

  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);

  useImperativeHandle(ref, () => ({ focus: () => btnRef.current?.focus() }));

  const handleToggle = useCallback(() => {
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) setAnchor({ top: rect.bottom + 4, left: rect.left });
    setOpen((p) => !p);
  }, []);

  const handleClose = useCallback(() => setOpen(false), []);

  return (
    <div className={cls.wrap}>
      <button
        ref={btnRef}
        type="button"
        className={`${cls.btn} ${selectedDefect ? cls.btnSelected : ''}`}
        onClick={handleToggle}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        {selectedDefect ? (
          <>
            <span
              className={cls.dot}
              style={{ background: SEVERITY_COLORS[selectedDefect.severity] }}
            />
            <span className={cls.text}>
              {selectedElement?.name === selectedDefect.name
                ? selectedDefect.name
                : `${selectedElement?.name ?? ''} → ${selectedDefect.name}`}
            </span>
            <span
              className={cls.sev}
              style={{ color: SEVERITY_COLORS[selectedDefect.severity] }}
            >
              {SEVERITY_LABELS[selectedDefect.severity]}
            </span>
          </>
        ) : (
          <span className={cls.placeholder}>Элемент / Дефект…</span>
        )}
        <span className={cls.arrow} aria-hidden>{open ? '▲' : '▼'}</span>
      </button>

      {selectedDefect && (
        <button
          type="button"
          className={cls.clearBtn}
          onClick={onClear}
          aria-label="Сбросить выбор дефекта"
        >
          <svg
            width="10" height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      )}

      {open && (
        <DefectTreePopup
          elements={elements}
          defectTypes={defectTypes}
          anchor={anchor}
          onSelect={onSelect}
          onClose={handleClose}
        />
      )}
    </div>
  );
}));

DefectPicker.displayName = 'DefectPicker';
