import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
} from 'react';

const SnapshotTimeContext = createContext({
  lastSnapshot: Date.now(),
});

export function SnapshotTimeProvider({
  lastSnapshot,
  children,
}: PropsWithChildren<{ lastSnapshot?: number }>) {
  if (!lastSnapshot) {
    return children;
  }
  return (
    <SnapshotTimeContext.Provider value={{ lastSnapshot }}>
      {children}
    </SnapshotTimeContext.Provider>
  );
}

export function useDurationSinceLastSnapshot() {
  const { lastSnapshot } = useContext(SnapshotTimeContext);
  const durationSinceLastSnapshot = useCallback(
    (value: string | number | Date) => {
      const date = new Date(value);
      return date.getTime() - lastSnapshot;
    },
    [lastSnapshot]
  );

  return durationSinceLastSnapshot;
}
