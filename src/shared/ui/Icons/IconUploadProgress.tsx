import { base } from './_base';
import type { IconProps } from './_base';
export function IconUploadProgress({ size = 16, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <polyline points="16 16 12 12 8 16" />
      <line x1="12" y1="12" x2="12" y2="21" />
      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
    </svg>
  );
}
