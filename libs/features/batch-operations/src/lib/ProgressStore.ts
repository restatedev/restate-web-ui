export class ProgressStore<T> {
  private listeners = new Set<() => void>();
  private readonly initialValue: T | null;

  constructor(private value: T | null) {
    this.initialValue = value;
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = () => {
    return this.value;
  };

  // Progress is produced entirely by client-side batch operations; the server
  // has none, so the SSR snapshot is the value the store was created with — a
  // stable reference that matches the fresh client value at hydration.
  getServerSnapshot = () => {
    return this.initialValue;
  };

  update(newValue: Partial<T>) {
    this.value = { ...this.value, ...newValue } as T;
    this.listeners.forEach((listener) => listener());
  }
}
