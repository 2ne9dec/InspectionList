import { memo, useSyncExternalStore } from 'react';
import { Portal } from '@/shared/ui/Portal';
import { dismissToast, toastStore } from '@/shared/lib/toast';
import type { ToastItem } from '@/shared/lib/toast';
import { IconClose } from '../Icons';
import cls from './Toaster.module.scss';

/**
 * Глобальный контейнер тостов. Подписывается на toastStore и рендерит
 * стек в портале. Размещать один раз в корне приложения.
 */
export const Toaster = memo(() => {
  const items = useSyncExternalStore(toastStore.subscribe, toastStore.getSnapshot, toastStore.getSnapshot);

  if (items.length === 0) return null;

  return (
    <Portal>
      <div className={cls.stack} role="region" aria-live="polite" aria-label="Уведомления">
        {items.map((t: ToastItem) => (
          <div
            key={t.id}
            className={`${cls.toast} ${cls[t.kind]}`}
            role={t.kind === 'error' ? 'alert' : 'status'}
          >
            <span className={cls.message}>{t.message}</span>
            <button
              type="button"
              className={cls.close}
              onClick={() => dismissToast(t.id)}
              aria-label="Закрыть"
            >
              <IconClose size={14} />
            </button>
          </div>
        ))}
      </div>
    </Portal>
  );
});

Toaster.displayName = 'Toaster';
