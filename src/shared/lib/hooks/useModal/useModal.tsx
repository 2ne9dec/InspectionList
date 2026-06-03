import { useCallback, useEffect, useRef, useState } from 'react';

interface UseModalProps {
  animationDelay: number;
  onClose?: () => void;
  isOpen?: boolean;
}

export function useModal({ animationDelay, onClose, isOpen }: UseModalProps) {
  const [isClosing, setIsClosing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
    }
  }, [isOpen]);

  const close = useCallback(() => {
    if (onClose) {
      setIsClosing(true);
      timerRef.current = setTimeout(() => {
        onClose();
        setIsClosing(false);
      }, animationDelay);
    }
  }, [animationDelay, onClose]);

  // Очищаем таймер при размонтировании / изменении isOpen,
  // чтобы не было вызова onClose после unmount.
  useEffect(() => {
    return () => {
      clearTimeout(timerRef.current);
    };
  }, [isOpen]);

  return { isClosing, isMounted, close };
}
