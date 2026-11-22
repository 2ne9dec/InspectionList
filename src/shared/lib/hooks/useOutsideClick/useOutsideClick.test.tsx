import { fireEvent, render, screen } from '@testing-library/react';
import { useRef } from 'react';
import type { RefObject } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useOutsideClick } from './useOutsideClick';

interface HarnessProps {
  onOutside: (event: MouseEvent) => void;
  enabled?: boolean;
  event?: 'mousedown' | 'click';
}

function SingleRefHarness({ onOutside, enabled, event }: HarnessProps) {
  const insideRef = useRef<HTMLDivElement>(null);
  useOutsideClick(insideRef, onOutside, { enabled, event });

  return (
    <div>
      <div ref={insideRef} data-testid='inside'>
        <span data-testid='inside-child'>внутри</span>
      </div>
      <div data-testid='outside'>снаружи</div>
    </div>
  );
}

function MultiRefHarness({ onOutside }: HarnessProps) {
  const firstRef = useRef<HTMLDivElement>(null);
  const secondRef = useRef<HTMLDivElement>(null);
  const refs: Array<RefObject<HTMLDivElement | null>> = [firstRef, secondRef];
  useOutsideClick(refs, onOutside);

  return (
    <div>
      <div ref={firstRef} data-testid='first'>первый</div>
      <div ref={secondRef} data-testid='second'>второй</div>
      <div data-testid='outside'>снаружи</div>
    </div>
  );
}

describe('useOutsideClick', () => {
  it('вызывает обработчик по клику вне элемента', () => {
    const onOutside = vi.fn();
    render(<SingleRefHarness onOutside={onOutside} />);

    fireEvent.mouseDown(screen.getByTestId('outside'));

    expect(onOutside).toHaveBeenCalledTimes(1);
  });

  it('не вызывает обработчик по клику внутри элемента или его потомка', () => {
    const onOutside = vi.fn();
    render(<SingleRefHarness onOutside={onOutside} />);

    fireEvent.mouseDown(screen.getByTestId('inside'));
    fireEvent.mouseDown(screen.getByTestId('inside-child'));

    expect(onOutside).not.toHaveBeenCalled();
  });

  it('не реагирует при enabled: false', () => {
    const onOutside = vi.fn();
    render(<SingleRefHarness onOutside={onOutside} enabled={false} />);

    fireEvent.mouseDown(screen.getByTestId('outside'));

    expect(onOutside).not.toHaveBeenCalled();
  });

  it('реагирует после включения enabled', () => {
    const onOutside = vi.fn();
    const { rerender } = render(
      <SingleRefHarness onOutside={onOutside} enabled={false} />,
    );

    rerender(<SingleRefHarness onOutside={onOutside} enabled />);
    fireEvent.mouseDown(screen.getByTestId('outside'));

    expect(onOutside).toHaveBeenCalledTimes(1);
  });

  it('поддерживает массив ref-ов', () => {
    const onOutside = vi.fn();
    render(<MultiRefHarness onOutside={onOutside} />);

    fireEvent.mouseDown(screen.getByTestId('first'));
    fireEvent.mouseDown(screen.getByTestId('second'));
    expect(onOutside).not.toHaveBeenCalled();

    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(onOutside).toHaveBeenCalledTimes(1);
  });

  it('слушает указанное событие вместо mousedown', () => {
    const onOutside = vi.fn();
    render(<SingleRefHarness onOutside={onOutside} event='click' />);

    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(onOutside).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('outside'));
    expect(onOutside).toHaveBeenCalledTimes(1);
  });

  it('передаёт событие клика в обработчик', () => {
    const onOutside = vi.fn();
    render(<SingleRefHarness onOutside={onOutside} />);

    const outside = screen.getByTestId('outside');
    fireEvent.mouseDown(outside);

    expect(onOutside.mock.calls[0][0]).toBeInstanceOf(MouseEvent);
    expect((onOutside.mock.calls[0][0] as MouseEvent).target).toBe(outside);
  });
});
