import type { Crumb } from './types';

const STORAGE_KEY = 'restate.breadcrumbs';
const MAX_ENTRIES = 50;

interface StoredTrails {
  order: string[];
  entries: Record<string, Crumb[]>;
}

function load(): StoredTrails {
  if (typeof window === 'undefined') {
    return { order: [], entries: {} };
  }
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StoredTrails;
      if (Array.isArray(parsed.order) && parsed.entries) {
        return parsed;
      }
    }
  } catch {
    // ignore corrupted or unavailable storage
  }
  return { order: [], entries: {} };
}

function save(data: StoredTrails) {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore unavailable storage
  }
}

export function getStoredTrail(locationKey: string): Crumb[] | undefined {
  return load().entries[locationKey];
}

export function storeTrail(locationKey: string, trail: Crumb[]) {
  const data = load();
  data.entries[locationKey] = trail;
  data.order = [
    ...data.order.filter((key) => key !== locationKey),
    locationKey,
  ];
  while (data.order.length > MAX_ENTRIES) {
    const evicted = data.order.shift();
    if (evicted) {
      delete data.entries[evicted];
    }
  }
  save(data);
}
