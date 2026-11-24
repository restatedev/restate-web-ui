export type ColumnWidths = Map<string, number>;

function withStorage<T>(run: (storage: Storage) => T, fallback: T): T {
  try {
    return run(localStorage);
  } catch {
    return fallback;
  }
}

function isWidth(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

export function readColumnWidths(storageKey: string): ColumnWidths {
  const parsed: unknown = withStorage(
    (storage) => JSON.parse(storage.getItem(storageKey) ?? '{}'),
    null,
  );
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return new Map();
  }
  return new Map(
    Object.entries(parsed).filter((entry): entry is [string, number] =>
      isWidth(entry[1]),
    ),
  );
}

export function saveColumnWidths(storageKey: string, widths: ColumnWidths) {
  const next = new Map([...readColumnWidths(storageKey), ...widths]);
  withStorage(
    (storage) =>
      storage.setItem(storageKey, JSON.stringify(Object.fromEntries(next))),
    undefined,
  );
  return next;
}
