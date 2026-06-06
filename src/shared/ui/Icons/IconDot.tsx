import type { SVGProps } from 'react';
export function IconDot({ size = 8, color = 'currentColor', ...p }: SVGProps<SVGSVGElement> & { size?: number; color?: string }) {
  return <svg width={size} height={size} viewBox="0 0 8 8" {...p}><circle cx="4" cy="4" r="4" fill={color} /></svg>;
}
