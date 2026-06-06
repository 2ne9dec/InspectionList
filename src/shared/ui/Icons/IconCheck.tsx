import { base } from './_base';
import type { IconProps } from './_base';
export function IconCheck({ size = 16, ...p }: IconProps) {
  return <svg {...base(size)} {...p}><polyline points="20 6 9 17 4 12" /></svg>;
}
