import type { ReactElement } from 'react';

export interface AppRoutesProps {
  path: string;
  element: ReactElement;
  authOnly: boolean;
}
