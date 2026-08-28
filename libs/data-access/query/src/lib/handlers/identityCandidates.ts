import type { StructuredStringFilter } from './structuredStringFilters';

export const MAX_IDENTITY_CANDIDATES = 10;

export interface IdentityCandidate {
  value: string;
  scope?: string;
}

export function normalizeIdentityCandidates<T extends { scope?: string }>(
  input: T[] | undefined,
  getValue: (candidate: T) => string,
): IdentityCandidate[] {
  const candidates = new Map<string, IdentityCandidate>();
  for (const candidate of (input ?? []).slice(0, MAX_IDENTITY_CANDIDATES)) {
    const parsed = {
      value: getValue(candidate),
      ...(candidate.scope !== undefined ? { scope: candidate.scope } : {}),
    };
    candidates.set(JSON.stringify([parsed.value, parsed.scope]), parsed);
  }
  return [...candidates.values()];
}

export function identityCandidateMatches<Field extends string>(
  candidate: IdentityCandidate,
  identityField: Field,
  search: string | undefined,
  filters: StructuredStringFilter<Field>[],
) {
  if (
    search &&
    !candidate.value.includes(search) &&
    !candidate.scope?.includes(search)
  ) {
    return false;
  }
  return filters.every((filter) => {
    const value =
      filter.field === identityField ? candidate.value : candidate.scope;
    if (value === undefined) return false;
    return filter.operation === 'EQUALS'
      ? value === filter.value
      : value.toLocaleLowerCase().includes(filter.value.toLocaleLowerCase());
  });
}
