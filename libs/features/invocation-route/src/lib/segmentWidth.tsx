import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useState,
  useSyncExternalStore,
} from 'react';

export class SegmentWidthStore {
  private listeners = new Set<() => void>();
  minWideFraction = Infinity;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  measure(probe: HTMLElement) {
    const { width, height } = probe.getBoundingClientRect();
    const next = width > 0 ? height / width : Infinity;
    if (next !== this.minWideFraction) {
      this.minWideFraction = next;
      this.listeners.forEach((listener) => listener());
    }
  }
}

export const SegmentWidthContext = createContext<SegmentWidthStore | null>(
  null,
);

export function SegmentWidthProvider({ children }: PropsWithChildren) {
  const [store] = useState(() => new SegmentWidthStore());
  const probeRef = useCallback(
    (probe: HTMLDivElement | null) => {
      if (!probe) {
        return;
      }
      store.measure(probe);
      const observer = new ResizeObserver(() => store.measure(probe));
      observer.observe(probe);
      return () => observer.disconnect();
    },
    [store],
  );
  return (
    <>
      <div
        ref={probeRef}
        aria-hidden
        className="pointer-events-none invisible absolute h-4 w-[calc((100%-1rem)*var(--timeline-scale,1))]"
      />
      <SegmentWidthContext value={store}>{children}</SegmentWidthContext>
    </>
  );
}

export function useIsSegmentWide(store: SegmentWidthStore, fraction: number) {
  return useSyncExternalStore(
    store.subscribe,
    () => fraction >= store.minWideFraction,
  );
}
