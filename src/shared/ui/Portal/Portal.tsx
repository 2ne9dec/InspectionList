import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

export interface PortalProps {
  children: ReactNode;
  /** DOM-узел, куда монтировать содержимое. По-умолчанию document.body. */
  element?: HTMLElement;
}

/**
 * SSR-безопасный портал: рендерит синхронно, чтобы ref на содержимое был доступен
 * в useLayoutEffect родителя (при async useEffect ref был бы null на момент срабатывания).
 */
export const Portal = ({ children, element }: PortalProps) => {
  if (typeof document === 'undefined') return null;
  return createPortal(children, element ?? document.body);
};
