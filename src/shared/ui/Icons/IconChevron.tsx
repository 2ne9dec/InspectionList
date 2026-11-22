import { base } from './_base';
import type { IconProps } from './_base';
export function IconChevron({ size = 10, open = true, style, ...p }: IconProps & { open?: boolean }) {
  return (
    <svg
      {...base(size)}
      {...p}
      style={{
        transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
        transition: 'transform var(--duration-base) var(--ease-standard)',
        ...style,
      }}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}
