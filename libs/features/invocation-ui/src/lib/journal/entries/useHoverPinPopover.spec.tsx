import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useHoverPinPopover } from './useHoverPinPopover';

function Harness({ onOpen }: { onOpen?: (isOpen: boolean) => void }) {
  const { isOpen, isPinned, triggerRef, onOpenChange, onPress, onPressStart } =
    useHoverPinPopover(onOpen);
  return (
    <div onPointerDownCapture={onPressStart} onKeyDownCapture={onPressStart}>
      <button ref={triggerRef} onClick={onPress}>
        chip
      </button>
      <button onClick={() => onOpenChange(true)}>request open</button>
      <button onClick={() => onOpenChange(false)}>request close</button>
      <output>{isPinned ? 'pinned' : isOpen ? 'hover' : 'closed'}</output>
      <p>outside</p>
      <div data-trigger="DialogTrigger">inside popover</div>
    </div>
  );
}

function state() {
  return screen.getByRole('status').textContent;
}

function requestOpen() {
  fireEvent.click(screen.getByRole('button', { name: 'request open' }));
}

function requestClose() {
  fireEvent.click(screen.getByRole('button', { name: 'request close' }));
}

function press() {
  const chip = screen.getByRole('button', { name: 'chip' });
  fireEvent.pointerDown(chip);
  fireEvent.click(chip);
}

describe('useHoverPinPopover', () => {
  it('opens on hover and closes when the hover ends', () => {
    const onOpen = vi.fn();
    render(<Harness onOpen={onOpen} />);
    requestOpen();
    expect(state()).toBe('hover');
    expect(onOpen).toHaveBeenCalledWith(true);
    requestClose();
    expect(state()).toBe('closed');
  });

  it('pins on a press, from closed and from hover', () => {
    render(<Harness />);
    press();
    expect(state()).toBe('pinned');
    press();
    expect(state()).toBe('closed');
    requestOpen();
    press();
    expect(state()).toBe('pinned');
  });

  it('pins a hover popover on pointer down, before the press ends', () => {
    render(<Harness />);
    requestOpen();
    fireEvent.pointerDown(screen.getByRole('button', { name: 'chip' }));
    expect(state()).toBe('pinned');
    requestClose();
    expect(state()).toBe('pinned');
  });

  it('keeps a pinned popover open when something else asks to close it', () => {
    render(<Harness />);
    press();
    requestClose();
    expect(state()).toBe('pinned');
  });

  it('closes on Escape and on a pointer down outside, not inside a popover', () => {
    render(<Harness />);
    press();
    fireEvent.pointerDown(screen.getByText('inside popover'));
    expect(state()).toBe('pinned');
    fireEvent.pointerDown(screen.getByText('outside'));
    expect(state()).toBe('closed');
    press();
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(state()).toBe('closed');
  });

  it('closes a pinned popover with the keyboard', () => {
    render(<Harness />);
    press();
    const chip = screen.getByRole('button', { name: 'chip' });
    fireEvent.keyDown(chip, { key: 'Enter' });
    fireEvent.click(chip);
    expect(state()).toBe('closed');
  });
});
