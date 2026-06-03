/**
 * Микро-store для тостов. Подписка через useSyncExternalStore.
 * Использование:
 *   import { toast } from '@/shared/lib/toast';
 *   toast.success('Сохранено');
 *   toast.error('Не удалось загрузить', { duration: 6000 });
 */

export type ToastKind = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
  /** Длительность показа в мс. 0 — не скрывать автоматически. */
  duration: number;
}

export interface ToastOptions {
  duration?: number;
}

type Listener = (state: ToastItem[]) => void;

let state: ToastItem[] = [];
const listeners = new Set<Listener>();
let nextId = 1;

function emit() {
  for (const l of listeners) l(state);
}

function push(kind: ToastKind, message: string, opts?: ToastOptions): number {
  const id = nextId++;
  const duration = opts?.duration ?? (kind === 'error' ? 6000 : 3500);
  const item: ToastItem = { id, kind, message, duration };
  state = [...state, item];
  emit();
  if (duration > 0) {
    setTimeout(() => dismiss(id), duration);
  }
  return id;
}

export function dismiss(id: number) {
  state = state.filter((t) => t.id !== id);
  emit();
}

export const toastStore = {
  subscribe(l: Listener): () => void {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
  getSnapshot(): ToastItem[] {
    return state;
  },
};

export const toast = {
  success: (message: string, opts?: ToastOptions) => push('success', message, opts),
  error: (message: string, opts?: ToastOptions) => push('error', message, opts),
  info: (message: string, opts?: ToastOptions) => push('info', message, opts),
  warning: (message: string, opts?: ToastOptions) => push('warning', message, opts),
  dismiss,
};
