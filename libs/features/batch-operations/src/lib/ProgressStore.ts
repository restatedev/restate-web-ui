export class ProgressStore<T> {
  private listeners = new Set<() => void>();

  constructor(private value: T | null) {}

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = () => {
    return this.value;
  };

  update(newValue: Partial<T>) {
    this.value = { ...this.value, ...newValue } as T;
    this.listeners.forEach((listener) => listener());
  }
}
