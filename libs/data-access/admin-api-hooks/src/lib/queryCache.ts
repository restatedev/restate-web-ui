import type {
  components,
  operations,
} from '@restate/data-access/admin-api-spec';
import { Query, QueryClient } from '@tanstack/react-query';
import {
  isGetInvocationJournalWithInvocationV2,
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

export function queryCacheOnSuccess(
  queryClient: QueryClient,
  data: unknown,
  query: Query<unknown, unknown, unknown, readonly unknown[]>,
) {
  if (isGetInvocationJournalWithInvocationV2(data, query)) {
    queryClient.setQueriesData(
      {
        predicate: (query) => {
          return isListInvocationsV2({}, query);
        },
      },
      (oldData: ReturnType<typeof useListInvocationsV2>['data']) => {
        if (!data || !oldData) return oldData;
        const newInvocation = toListInvocation(data);
        return {
          ...oldData,
          rows: oldData.rows.map((oldInvocation) =>
            oldInvocation.id === newInvocation.id
              ? newInvocation
              : oldInvocation,
          ),
        };
      },
    );
  }
}
