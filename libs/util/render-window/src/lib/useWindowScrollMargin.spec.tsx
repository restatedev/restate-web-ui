import { act, render, screen } from '@testing-library/react';
import { createRef, type RefObject } from 'react';
import { vi } from 'vitest';
import { useWindowScrollMargin } from './useWindowScrollMargin';

let resize: ResizeObserverCallback | undefined;
let observed: Element[] = [];
const disconnect = vi.fn();

class ResizeObserverMock implements ResizeObserver {
  constructor(callback: ResizeObserverCallback) {
    resize = callback;
  }
  disconnect = disconnect;
  observe = (element: Element) => {
    observed.push(element);
  };
  unobserve = vi.fn();
}

function List({ listRef }: { listRef: RefObject<HTMLDivElement | null> }) {
  const [callbackRef, scrollMargin] = useWindowScrollMargin(listRef);
  return (
    <div data-testid="page">
      <div ref={callbackRef} data-testid="list">
        {scrollMargin}
      </div>
    </div>
  );
}

function mockListTop(top: number) {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    top,
  } as DOMRect);
}

describe('useWindowScrollMargin', () => {
  beforeAll(() => {
    globalThis.ResizeObserver = ResizeObserverMock;
  });

  beforeEach(() => {
    observed = [];
    disconnect.mockClear();
    vi.spyOn(window, 'scrollY', 'get').mockReturnValue(200);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('measures the list from the top of the page', () => {
    mockListTop(400.4);
    const listRef = createRef<HTMLDivElement>();
    render(<List listRef={listRef} />);

    expect(screen.getByTestId('list').textContent).toBe('600');
    expect(listRef.current).toBe(screen.getByTestId('list'));
  });

  it('measures again when an ancestor resizes', () => {
    mockListTop(400);
    render(<List listRef={createRef()} />);

    expect(observed).toContain(screen.getByTestId('page'));
    expect(observed).toContain(document.body);
    expect(observed).not.toContain(screen.getByTestId('list'));

    mockListTop(474);
    act(() => resize?.([], {} as ResizeObserver));

    expect(screen.getByTestId('list').textContent).toBe('674');
  });

  it('stops observing on unmount', () => {
    mockListTop(400);
    const listRef = createRef<HTMLDivElement>();
    const { unmount } = render(<List listRef={listRef} />);
    unmount();

    expect(disconnect).toHaveBeenCalled();
    expect(listRef.current).toBeNull();
  });
});
