import type { ReactElement } from 'react';

export interface AppRoutesProps {
  path: string;
  element: ReactElement;
  authOnly: boolean;
  /** Если true — доступно только admin (role === 'admin') */
  adminOnly?: boolean;
}
