import { memo, useEffect } from 'react';
import type { ReactNode } from 'react';
import { classNames } from '@/shared/lib/classNames/classNames';
import { useModal, useEscape } from '@/shared/lib/hooks';
import { appConfig } from '@/shared/config';
import { Overlay } from '../Overlay';
import { Portal } from '../Portal';
import { IconClose } from '../Icons';
import cls from './Modal.module.scss';

export type ModalSize = 's' | 'm' | 'l' | 'xl';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Заголовок (опционально). */
  title?: ReactNode;
  /** Нижняя зона действий (опционально). */
  footer?: ReactNode;
  /** Лениво монтировать содержимое (рендер только когда открыт). По-умолчанию true. */
  lazy?: boolean;
  /** Размер модалки. */
  size?: ModalSize;
  /** Запретить закрытие по overlay-клику. */
  disableOverlayClose?: boolean;
  /** Запретить закрытие по ESC. */
  disableEscapeClose?: boolean;
  /** ARIA-описание (если нет видимого заголовка). */
  'aria-label'?: string;
  className?: string;
  children?: ReactNode;
}

/**
 * Универсальная модалка приложения.
 *  - управляет анимацией открытия/закрытия (через useModal)
 *  - блокирует scroll фона
 *  - закрывается по overlay-клику и Escape
 *  - доступна с клавиатуры (role=dialog + aria-modal)
 */
export const Modal = memo((props: ModalProps) => {
  const {
    isOpen,
    onClose,
    title,
    footer,
    lazy = true,
    size = 'm',
    disableOverlayClose,
    disableEscapeClose,
    className,
    children,
    ...rest
  } = props;

  const { close, isClosing, isMounted } = useModal({
    animationDelay: appConfig.modalAnimationDelay,
    isOpen,
    onClose,
  });

  // Закрытие по Escape — централизованно через хук
  useEscape(close, { enabled: isOpen && !disableEscapeClose });

  // Блокируем скролл фона на время открытой модалки
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  if (lazy && !isMounted) return null;

  return (
    <Portal>
      <div
        className={classNames(
          cls.Modal,
          { [cls.opened]: isOpen, [cls.isClosing]: isClosing },
          [className, cls[`size_${size}`]],
        )}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : rest['aria-label']}
      >
        <Overlay onClick={disableOverlayClose ? undefined : close} />
        <div className={cls.content} onClick={(e) => e.stopPropagation()}>
          {title && (
            <header className={cls.header}>
              <h2 className={cls.title}>{title}</h2>
              <button
                type="button"
                aria-label="Закрыть"
                className={cls.closeBtn}
                onClick={close}
              >
                <IconClose size={16} />
              </button>
            </header>
          )}
          <div className={cls.body}>{children}</div>
          {footer && <footer className={cls.footer}>{footer}</footer>}
        </div>
      </div>
    </Portal>
  );
});

Modal.displayName = 'Modal';
