import type {
  components,
  operations,
} from '@restate/data-access/admin-api-spec';
import { Query, QueryClient } from '@tanstack/react-query';
import {
  isGetInvocationJournalWithInvocationV2,
  isGetVqueue,
  isListInvocationsV2,
} from './hooks';
import { useListInvocationsV2 } from './invocationV2Hooks';

type InvocationDetail =
  operations['get_invocation_journal_v2']['responses']['200']['content']['application/json'];
type InvocationV2 = components['schemas']['InvocationV2'];

function toListInvocation(detail: InvocationDetail): InvocationV2 {
  const invocation = { ...detail };
  delete invocation.journal;
  return invocation;
}

export function queryCacheOnSuccess<TError>(
  queryClient: QueryClient,
  data: unknown,
  query: Query<unknown, TError, unknown, readonly unknown[]>,
) {
  let newInvocation: InvocationV2 | undefined;
  if (isGetInvocationJournalWithInvocationV2(data, query)) {
    newInvocation = toListInvocation(data);
  } else if (isGetVqueue(data, query)) {
    newInvocation = data.focusedInvocation;
  }
  if (!newInvocation) return;
  const focusedInvocation = newInvocation;

  queryClient.setQueriesData(
    {
      predicate: (query) => {
        return isListInvocationsV2({}, query);
      },
    },
    (oldData: ReturnType<typeof useListInvocationsV2>['data']) => {
      if (!oldData) return oldData;
      return {
        ...oldData,
        rows: oldData.rows.map((oldInvocation) =>
          oldInvocation.id === focusedInvocation.id
            ? focusedInvocation
            : oldInvocation,
        ),
      };
    },
  );
}
