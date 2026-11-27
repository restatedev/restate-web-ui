const STORAGE_KEY = 'restate.breadcrumbs.lists';
const MAX_ENTRIES = 50;

function load(): Record<string, string> {
  if (typeof window === 'undefined') {
    return {};
  }
  try {
    const parsed: unknown = JSON.parse(
      window.sessionStorage.getItem(STORAGE_KEY) ?? '{}',
    );
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, string>)
      : {};
  } catch {
    return {};
  }
}

export function getListSearch(pathname: string): string | undefined {
  const search = load()[pathname];
  return typeof search === 'string' ? search : undefined;
}

export function storeListSearch(pathname: string, search: string) {
  if (typeof window === 'undefined') {
    return;
  }
  const entries = load();
  if (entries[pathname] === search) {
    return;
  }
  delete entries[pathname];
  entries[pathname] = search;
  const keys = Object.keys(entries);
  for (const key of keys.slice(0, Math.max(0, keys.length - MAX_ENTRIES))) {
    delete entries[key];
  }
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    return;
  }
}
