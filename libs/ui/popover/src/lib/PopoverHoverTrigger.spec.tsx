import { act, fireEvent, render, screen } from '@testing-library/react';
import { Button } from 'react-aria-components';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Popover } from './Popover';
import { PopoverContent } from './PopoverContent';
import { PopoverHoverTrigger } from './PopoverTrigger';

function HoverPopover() {
  return (
    <Popover>
      <PopoverHoverTrigger openDelay={300}>
        <Button>chip</Button>
      </PopoverHoverTrigger>
      <PopoverContent isNonModal>payload</PopoverContent>
    </Popover>
  );
}

describe('PopoverHoverTrigger', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('opens once the pointer moves over the trigger', () => {
    render(<HoverPopover />);
    const trigger = screen.getByRole('button', { name: 'chip' });

    fireEvent.mouseEnter(trigger);
    fireEvent.mouseMove(trigger);
    act(() => {
      vi.advanceTimersByTime(350);
    });

    expect(screen.getByText('payload')).toBeTruthy();
  });

  it('stays closed after it is dismissed until the pointer comes back', () => {
    render(<HoverPopover />);
    const trigger = screen.getByRole('button', { name: 'chip' });

    fireEvent.mouseEnter(trigger);
    fireEvent.mouseMove(trigger);
    act(() => {
      vi.advanceTimersByTime(350);
    });
    fireEvent.keyDown(screen.getByText('payload'), { key: 'Escape' });
    act(() => {
      vi.advanceTimersByTime(350);
    });
    expect(screen.queryByText('payload')).toBeNull();

    fireEvent.mouseMove(trigger);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.queryByText('payload')).toBeNull();

    fireEvent.mouseLeave(trigger);
    fireEvent.mouseEnter(trigger);
    fireEvent.mouseMove(trigger);
    act(() => {
      vi.advanceTimersByTime(350);
    });
    expect(screen.getByText('payload')).toBeTruthy();
  });

  it('stays closed when content moves under a still pointer', () => {
    render(<HoverPopover />);
    const trigger = screen.getByRole('button', { name: 'chip' });

    fireEvent.mouseEnter(trigger);
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.queryByText('payload')).toBeNull();
  });
});
