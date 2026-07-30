export const VIRTUAL_OBJECTS_PATH = '/virtual-objects';
export const VIRTUAL_OBJECT_SCOPE_QUERY_PARAM = 'scope';

export interface VirtualObjectInstanceIdentity {
  service: string;
  key: string;
  scope?: string;
}

export function virtualObjectInstanceHref(
  baseUrl: string,
  { service, key, scope }: VirtualObjectInstanceIdentity,
): string {
  const pathname = `${baseUrl}${VIRTUAL_OBJECTS_PATH}/${encodeURIComponent(service)}/${encodeURIComponent(key)}`;
  if (scope === undefined) {
    return pathname;
  }
  const searchParams = new URLSearchParams();
  searchParams.set(VIRTUAL_OBJECT_SCOPE_QUERY_PARAM, scope);
  return `${pathname}?${searchParams}`;
}

export function virtualObjectScopeFromSearch(
  search: string | URLSearchParams,
): string | undefined {
  const searchParams =
    typeof search === 'string'
      ? new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
      : search;
  return searchParams.has(VIRTUAL_OBJECT_SCOPE_QUERY_PARAM)
    ? String(searchParams.get(VIRTUAL_OBJECT_SCOPE_QUERY_PARAM))
    : undefined;
}

export function formatVirtualObjectInstanceIdentity({
  service,
  key,
  scope,
}: VirtualObjectInstanceIdentity): string {
  return scope === undefined
    ? `${service} / ${key}`
    : `Scope ${scope} · ${service} / ${key}`;
}
