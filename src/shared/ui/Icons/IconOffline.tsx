import { base } from './_base';
import type { IconProps } from './_base';

/** Wi-Fi с перечёркиванием — офлайн-листок, ожидает синхронизации. */
export function IconOffline({ size = 14, ...p }: IconProps) {
  return (
    <svg {...base(size)} {...p}>
      <path d="M5 12.55a11 11 0 0 1 14.08 0" opacity="0.5" />
      <path d="M1.42 9a16 16 0 0 1 21.16 0" opacity="0.3" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <circle
        cx="12"
        cy="20"
        r="1.5"
        fill="var(--color-warning)"
        stroke="none"
      />
      <line
        x1="2"
        y1="2"
        x2="22"
        y2="22"
        stroke="var(--color-error)"
        strokeWidth="2"
      />
    </svg>
  );
}
