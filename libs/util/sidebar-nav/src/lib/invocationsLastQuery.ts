// In-memory store of the last filter/sort/column state of the invocations
// page. The invocations route's clientLoader restores filter_* params from
// this store when navigating to /invocations with no filter_* keys (e.g.
// sidebar nav back to the page).
//
// Race-condition note for anyone editing code that calls setSearchParams on
// the invocations page: clientLoader runs DURING navigation, BEFORE the
// useEffect that saves lastQuery on URL change. If you set search params
// that delete all filter_* keys and rely only on the useEffect, the loader
// will read STALE lastQuery and restore the previous filters, reverting
// your change. To clear filters safely, either:
//   1. Keep at least one filter_* key in the URL with an empty value array
//      (the deriveClausesFromUrl logic treats empty value as no filter,
//      so the API isn't affected — see StatusSummaryBar, setServiceFilter)
//   2. Call saveInvocationsLastQuery(newSearchParams) BEFORE setSearchParams
//      so the loader sees the cleared state synchronously
//      (see commitQuery, FilterShortcuts.setFilter)
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
