import { Query, QueryClient } from '@tanstack/react-query';
import {
  isGetInvocationJournalWithInvocationV2,
  isListInvocations,
  useListInvocations,
} from './hooks';

export function queryCacheOnSuccess(
  queryClient: QueryClient,
  data: unknown,
  query: Query<unknown, unknown, unknown, readonly unknown[]>,
) {
  if (isGetInvocationJournalWithInvocationV2(data, query)) {
    queryClient.setQueriesData(
      {
        predicate: (query) => {
          return isListInvocations({}, query);
        },
      },
      (oldData: ReturnType<typeof useListInvocations>['data']) => {
        if (data && oldData) {
          const { journal, ...newInvocation } = data ?? {};
          if (newInvocation) {
            return {
              ...oldData,
              rows: oldData.rows.map((oldInvocation) => {
                if (oldInvocation.id === newInvocation.id) {
                  return newInvocation;
                } else {
                  return oldInvocation;
                }
              }),
            };
          }
        }
        return oldData;
      },
    );
  }
}
