let lastQuery: URLSearchParams | null = null;

function isPersistedKey(key: string): boolean {
  return (
    key.startsWith('filter_') ||
    key.startsWith('sort_') ||
    key === 'column'
  );
}

export function saveInvocationsLastQuery(
  searchParams: URLSearchParams,
): void {
  const filtered = new URLSearchParams();
  for (const [key, value] of searchParams) {
    if (isPersistedKey(key)) filtered.append(key, value);
  }
  lastQuery = filtered;
}

export function getInvocationsLastQuery(): URLSearchParams | null {
  return lastQuery ? new URLSearchParams(lastQuery) : null;
}
