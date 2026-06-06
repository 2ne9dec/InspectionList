import { base } from './_base';
import type { IconProps } from './_base';
export function IconAI({ size = 16, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <rect x="3" y="7" width="18" height="13"
        rx="2" />
      <path d="M8 7V5a4 4 0 0 1 8 0v2" />
      <circle cx="9" cy="13" r="1.2"
        fill="currentColor" stroke="none" />
      <circle cx="15" cy="13" r="1.2"
        fill="currentColor" stroke="none" />
      <path d="M9 17c1 .8 2.2 1 3 1s2-.2 3-1" />
    </svg>
  );
}
