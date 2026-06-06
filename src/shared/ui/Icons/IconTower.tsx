import { base } from './_base';
import type { IconProps } from './_base';
export function IconTower({ size = 16, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <line x1="12" y1="22" x2="12" y2="3" />
      <line x1="5" y1="7" x2="19" y2="7" />
      <line x1="7" y1="11" x2="17" y2="11" />
      <line x1="12" y1="5" x2="5" y2="7" />
      <line x1="12" y1="5" x2="19" y2="7" />
      <line x1="12" y1="22" x2="7" y2="22" />
      <line x1="12" y1="22" x2="17" y2="22" />
      <line x1="12" y1="17" x2="7" y2="22" />
      <line x1="12" y1="17" x2="17" y2="22" />
      <path d="M5 7 Q8.5 9 12 8.5 Q15.5 8 19 7" strokeWidth="1" opacity="0.7" />
      <path d="M7 11 Q9.5 13 12 12.5 Q14.5 12 17 11" strokeWidth="1" opacity="0.7" />
    </svg>
  );
}
