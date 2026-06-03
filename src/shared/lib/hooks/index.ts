/**
 * Единая точка импорта всех shared-хуков.
 * Использование: `import { useAppDispatch, useBreakpoint } from '@/shared/lib/hooks';`
 */

export { useAppDispatch } from './useAppDispatch';
export { useBreakpoint } from './useBreakpoint';
export { useDebounce } from './useDebounce';
export { useEscape } from './useEscape';
export { useFloatingPosition } from './useFloatingPosition';
export type { FloatingPosition } from './useFloatingPosition';
export { useModal } from './useModal';
export { useOutsideClick } from './useOutsideClick';
export { useTheme } from './useTheme';

export { useOnlineStatus } from './useOnlineStatus';
export { useAppSelector } from './useAppSelector';
export { useSelectWidth } from './useSelectWidth';
