// Query params that drive one-shot UI state (confirmation dialogs and the
// like) as opposed to shareable view state (filters, sort, columns, panels).
// Surfaces that snapshot the current URL to restore later — breadcrumb trail,
// last-query memory — must strip these, otherwise a stored link reopens the
// dialog. Params self-register when their dialog is defined/mounted, so the
// set is populated before any capture can include them.
const transientQueryParams = new Set<string>();

export function registerTransientQueryParams(...names: string[]) {
  names.forEach((name) => transientQueryParams.add(name));
}

export function activeTransientQueryParams(
  searchParams: URLSearchParams,
): string[] {
  return Array.from(transientQueryParams)
    .filter((name) => searchParams.has(name))
    .sort();
}

export function stripTransientQueryParams(
  searchParams: URLSearchParams,
): URLSearchParams {
  const next = new URLSearchParams(searchParams);
  transientQueryParams.forEach((name) => next.delete(name));
  return next;
}

export function stripTransientSearch(search: string): string {
  const params = new URLSearchParams(search);
  if (!Array.from(transientQueryParams).some((name) => params.has(name))) {
    return search;
  }
  const value = stripTransientQueryParams(params).toString();
  return value ? `?${value}` : '';
}
