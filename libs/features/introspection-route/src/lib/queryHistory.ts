import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'restate.introspection.query-history';
const MAX_HISTORY = 25;

const EMPTY: string[] = [];

function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function readStorage(): string | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStorage(value: string) {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    return;
  }
}

export function getQueryHistory(): string[] {
  const parsed = safeParse<string[]>(readStorage());
  if (!Array.isArray(parsed)) return EMPTY;
  return parsed.filter(
    (query): query is string =>
      typeof query === 'string' && query.trim().length > 0,
  );
}

let snapshot: string[] = getQueryHistory();
const listeners = new Set<VoidFunction>();

function emit() {
  snapshot = getQueryHistory();
  listeners.forEach((listener) => listener());
}

function write(history: string[]) {
  writeStorage(JSON.stringify(history));
  emit();
}

export function addQueryToHistory(query: string) {
  const trimmed = query.trim();
  if (!trimmed) return;
  const current = getQueryHistory();
  if (current[0] === trimmed) return;
  const next = [trimmed, ...current.filter((q) => q !== trimmed)].slice(
    0,
    MAX_HISTORY,
  );
  write(next);
}

export function removeQueryFromHistory(query: string) {
  const current = getQueryHistory();
  const next = current.filter((q) => q !== query);
  if (next.length === current.length) return;
  write(next);
}

export function clearQueryHistory() {
  if (getQueryHistory().length === 0) return;
  write([]);
}

let isListeningToStorage = false;
function ensureStorageListener() {
  if (isListeningToStorage || typeof window === 'undefined') return;
  isListeningToStorage = true;
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY) {
      emit();
    }
  });
}

function subscribe(callback: VoidFunction) {
  ensureStorageListener();
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function getSnapshot() {
  return snapshot;
}

function getServerSnapshot() {
  return EMPTY;
}

export function useQueryHistory() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
