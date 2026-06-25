import { useMemo } from 'react';
import {
  useListServices,
  useGetInvocationsJournalWithInvocationsV2,
} from '@restate/data-access/admin-api-hooks';

// Handler (or service) metadata keys controlling which journal entries are
// hidden by default in the compact view. `…hidden.names` is a comma-separated
// list of names matched exactly; `…hidden.name.prefix` is a single prefix
// matching any name that starts with it. They live under the reserved
// `dev.restate.` namespace (so they stay out of the user-facing metadata table)
// and the `tooling.` scope to signal they only affect tooling — never execution
// correctness or storage. Segments are lowercase and dot-separated to match the
// existing `dev.restate.*` keys (e.g. `dev.restate.serde.preview`).
export const HIDDEN_ENTRY_NAMES_METADATA_KEY =
  'dev.restate.tooling.journal.hidden.names';
export const HIDDEN_ENTRY_NAME_PREFIX_METADATA_KEY =
  'dev.restate.tooling.journal.hidden.name.prefix';

export function parseCommaSeparatedList(value?: string): string[] {
  if (!value) {
    return [];
  }
  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

// The hidden rules resolved for a single handler: a set of exact names and an
// optional single name prefix. A blank prefix is treated as unset so it can't
// turn into a match-everything rule.
export type HiddenEntryMatcher = {
  names: Set<string>;
  prefix?: string;
};

export function isHiddenEntryName(
  matcher: HiddenEntryMatcher | undefined,
  name: string | undefined,
): boolean {
  if (!matcher || !name) {
    return false;
  }
  return (
    matcher.names.has(name) ||
    (matcher.prefix !== undefined && name.startsWith(matcher.prefix))
  );
}

type InvocationsData = ReturnType<
  typeof useGetInvocationsJournalWithInvocationsV2
>['data'];

// Resolves, per loaded invocation, the entries its handler marked hidden. The
// journal can span several invocations from different handlers
// (Call/AttachInvocation), so each invocation is resolved against its own
// target handler (falling back to service-level metadata, mirroring the serde
// preview convention). Only invocations with at least one rule are included.
export function useHiddenEntryMatchers(data?: InvocationsData) {
  const { data: services } = useListServices();

  return useMemo(() => {
    const byInvocation = new Map<string, HiddenEntryMatcher>();
    for (const [invocationId, invocation] of Object.entries(data ?? {})) {
      const serviceName = invocation?.target_service_name;
      if (!serviceName) {
        continue;
      }
      const service = services.get(serviceName);
      if (!service) {
        continue;
      }
      const handler = service.handlers.find(
        (candidate) => candidate.name === invocation?.target_handler_name,
      );
      const names = parseCommaSeparatedList(
        handler?.metadata?.[HIDDEN_ENTRY_NAMES_METADATA_KEY] ??
          service.metadata?.[HIDDEN_ENTRY_NAMES_METADATA_KEY],
      );
      const prefix =
        (
          handler?.metadata?.[HIDDEN_ENTRY_NAME_PREFIX_METADATA_KEY] ??
          service.metadata?.[HIDDEN_ENTRY_NAME_PREFIX_METADATA_KEY]
        )?.trim() || undefined;
      if (names.length > 0 || prefix) {
        byInvocation.set(invocationId, { names: new Set(names), prefix });
      }
    }
    return byInvocation;
  }, [data, services]);
}
