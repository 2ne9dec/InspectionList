import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

export interface PortalProps {
  children: ReactNode;
  /** DOM-узел, куда монтировать содержимое. По-умолчанию document.body. */
  element?: HTMLElement;
}

/**
 * SSR-безопасный портал: ничего не рендерит на сервере, монтируется в DOM после первого рендера.
 */
export const Portal = ({ children, element }: PortalProps) => {
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setContainer(element ?? document.body);
  }, [element]);

  if (!container) return null;
  return createPortal(children, container);
};
