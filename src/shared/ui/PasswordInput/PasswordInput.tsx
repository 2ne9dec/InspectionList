import { memo, useCallback, useState } from 'react';
import { Input } from '../Input';
import type { InputProps } from '../Input';
import { IconEye, IconEyeOff } from '../Icons';
import cls from './PasswordInput.module.scss';

export type PasswordInputProps = Omit<InputProps, 'type' | 'rightSlot'>;

/**
 * Поле пароля с кнопкой «глаз»: пароль виден, только пока кнопка зажата
 * (мышью или пальцем). Отпустили или увели курсор — пароль снова скрыт.
 */
export const PasswordInput = memo((props: PasswordInputProps) => {
  const [visible, setVisible] = useState(false);
  const show = useCallback((e: React.PointerEvent) => { e.preventDefault(); setVisible(true); }, []);
  const hide = useCallback(() => setVisible(false), []);

  return (
    <Input
      {...props}
      type={visible ? 'text' : 'password'}
      rightSlot={
        <button
          type='button'
          className={cls.toggle}
          onPointerDown={show}
          onPointerUp={hide}
          onPointerLeave={hide}
          onPointerCancel={hide}
          onContextMenu={(e) => e.preventDefault()}
          aria-label='Показать пароль (удерживайте)'
          title='Удерживайте, чтобы увидеть пароль'
          tabIndex={-1}
        >
          {visible ? <IconEye size={18} /> : <IconEyeOff size={18} />}
        </button>
      }
    />
  );
});

PasswordInput.displayName = 'PasswordInput';
