// In-memory store of the last filter/sort/column state of the invocations
// page. The invocations route's clientLoader restores filter_* params from
// this store ONLY when the URL has `?restore=1` — the explicit opt-in is set
// by the "Back to invocations" link on detail pages. Default navigation
// (sidebar All, fresh URL, preset shortcuts) shows the unfiltered view.
//
// Keyed by scope (the invocations base path — the environment in Cloud, `''`
// in standalone web-ui) so one environment's saved filters never restore in
// another after an in-app environment switch.
//
// Anyone clearing filters can safely just `params.delete('filter_*')` — the
// loader won't auto-restore. To explicitly restore (rare), navigate to
// `/invocations?restore=1`.
const lastQueryByScope = new Map<string, URLSearchParams>();

function isPersistedKey(key: string): boolean {
  return (
    key.startsWith('filter_') || key.startsWith('sort_') || key === 'column'
  );
}

export function saveInvocationsLastQuery(
  searchParams: URLSearchParams,
  scope = '',
): void {
  const filtered = new URLSearchParams();
  for (const [key, value] of searchParams) {
    if (isPersistedKey(key)) filtered.append(key, value);
  }
  lastQueryByScope.set(scope, filtered);
}

export function getInvocationsLastQuery(scope = ''): URLSearchParams | null {
  const lastQuery = lastQueryByScope.get(scope);
  return lastQuery ? new URLSearchParams(lastQuery) : null;
}
