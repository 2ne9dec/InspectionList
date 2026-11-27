import { memo, useCallback, useImperativeHandle, useRef, useState, forwardRef } from 'react';
import type { DefectType, Element } from '@/entities/InspectionLine';
import { IconChevron, IconClose } from '@/shared/ui/Icons';
import { DefectTreePopup } from './DefectTreePopup';
import cls from './DefectPicker.module.scss';

export interface DefectPickerProps {
  elements: ReadonlyArray<Element>;
  defectTypes: ReadonlyArray<DefectType>;
  selectedDefect: DefectType | undefined;
  selectedElement: Element | undefined;
  /** Введённый вручную текст для дефекта с признаком custom. */
  customValue?: string;
  /** id кнопки-триггера — нужен для связки с <label htmlFor>. */
  id?: string;
  onSelect: (defect: DefectType) => void;
  onClear: () => void;
}

export interface DefectPickerHandle {
  focus: () => void;
}

export const DefectPicker = memo(forwardRef<DefectPickerHandle, DefectPickerProps>((props, ref) => {
  const { elements, defectTypes, selectedDefect, selectedElement, customValue, id, onSelect, onClear } = props;

  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);

  useImperativeHandle(ref, () => ({ focus: () => btnRef.current?.focus() }));

  const handleToggle = useCallback(() => {
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) setAnchor({ top: rect.bottom + 4, left: rect.left });
    setOpen((p) => !p);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    // После закрытия ESC/outside-click браузер теряет фокус.
    // Возвращаем фокус на кнопку, чтобы следующий клик сразу срабатывал.
    requestAnimationFrame(() => btnRef.current?.focus());
  }, []);

  return (
    <div className={cls.wrap}>
      <button
        ref={btnRef}
        id={id}
        type="button"
        className={cls.btn + (selectedDefect ? ' ' + cls.btnSelected : '')}
        onClick={handleToggle}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        {selectedDefect ? (
          <>
            <span className={cls.text}>
              {selectedDefect.custom
                ? (selectedElement?.name ?? '') + ' → '
                  + (customValue?.trim() || 'впишите дефект')
                : selectedElement?.name === selectedDefect.name
                  ? selectedDefect.name
                  : (selectedElement?.name ?? '') + ' → ' + selectedDefect.name}
            </span>
          </>
        ) : (
          <span className={cls.placeholder}>Элемент / Дефект...</span>
        )}
        <span className={cls.arrow} aria-hidden>
          <IconChevron size={10} open={open} />
        </span>
      </button>

      {selectedDefect && (
        <button
          type="button"
          className={cls.clearBtn}
          onClick={onClear}
          aria-label="Сбросить выбор дефекта"
        >
          <IconClose size={10} />
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
