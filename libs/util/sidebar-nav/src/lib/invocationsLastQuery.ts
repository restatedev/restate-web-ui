// In-memory store of the last filter/sort/column state of the invocations
// page. The invocations route's clientLoader restores filter_* params from
// this store ONLY when the URL has `?restore=1` — the explicit opt-in is set
// by the "Back to invocations" link on detail pages. Default navigation
// (sidebar All, fresh URL, preset shortcuts) shows the unfiltered view.
//
// Anyone clearing filters can safely just `params.delete('filter_*')` — the
// loader won't auto-restore. To explicitly restore (rare), navigate to
// `/invocations?restore=1`.
let lastQuery: URLSearchParams | null = null;

function isPersistedKey(key: string): boolean {
  return (
    key.startsWith('filter_') || key.startsWith('sort_') || key === 'column'
  );
}

export function saveInvocationsLastQuery(searchParams: URLSearchParams): void {
  const filtered = new URLSearchParams();
  for (const [key, value] of searchParams) {
    if (isPersistedKey(key)) filtered.append(key, value);
  }
  lastQuery = filtered;
}

export function getInvocationsLastQuery(): URLSearchParams | null {
  return lastQuery ? new URLSearchParams(lastQuery) : null;
}
