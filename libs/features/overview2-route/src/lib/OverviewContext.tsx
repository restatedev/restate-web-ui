import {
  createContext,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  use,
  useCallback,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react';
import type { SortDescriptor } from 'react-aria-components';
import { useSearchParams } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { isOverviewRefreshQuery } from '@restate/data-access/admin-api';
import { useRestateContext } from '@restate/features/restate-context';
import {
  HANDLER_QUERY_PARAM,
  SERVICE_PLAYGROUND_QUERY_PARAM,
  SERVICE_QUERY_PARAM,
} from '@restate/features/service';
import { INVOCATION_QUERY_NAME } from '@restate/features/invocation-route';
import { STATE_QUERY_NAME } from '@restate/features/state-object-route';
import { DEPLOYMENT_QUERY_PARAM } from '@restate/features/deployment';
import { toCreatedAfterParam } from '@restate/util/invocation-links';
import { useOverviewData } from './useOverviewData';
import { useRangeFilters } from './useRangeFilters';
import {
  getOverviewMode,
  OVERVIEW_MODE_PARAM,
  type OverviewMode,
} from './overviewMode';

const PRESERVE_PARAMS = [
  SERVICE_PLAYGROUND_QUERY_PARAM,
  SERVICE_QUERY_PARAM,
  DEPLOYMENT_QUERY_PARAM,
  INVOCATION_QUERY_NAME,
  STATE_QUERY_NAME,
  HANDLER_QUERY_PARAM,
] as const;

type OverviewContextValue = ReturnType<typeof useOverviewData> & {
  baseUrl: string;
  filter: string;
  setFilter: Dispatch<SetStateAction<string>>;
  linkParams: URLSearchParams;
  resolvedServiceSortDescriptor: SortDescriptor;
  resolvedDeploymentSortDescriptor: SortDescriptor;
  setServiceSortDescriptor: Dispatch<SetStateAction<SortDescriptor | null>>;
  setDeploymentSortDescriptor: Dispatch<SetStateAction<SortDescriptor | null>>;
  mode: OverviewMode;
  triggerManualRefresh: () => void;
};

const OverviewContext = createContext<OverviewContextValue>(null as never);

export function OverviewProvider({ children }: { children: ReactNode }) {
  const rangeFilters = useRangeFilters();
  const [searchParams] = useSearchParams();
  const mode = getOverviewMode(searchParams.get(OVERVIEW_MODE_PARAM));
  const overviewData = useOverviewData(rangeFilters);
  const { baseUrl } = useRestateContext();
  const queryClient = useQueryClient();
  const [isManualRefreshing, startTransition] = useTransition();
  const triggerManualRefresh = useCallback(() => {
    startTransition(async () => {
      await queryClient.refetchQueries(
        {
          type: 'active',
          predicate: isOverviewRefreshQuery,
        },
        { cancelRefetch: true },
      );
    });
  }, [queryClient]);
  const isSummaryLoading =
    overviewData.isSummaryLoading || isManualRefreshing;

  const initialSortRef = useRef<SortDescriptor | null>(null);
  if (
    !initialSortRef.current &&
    !overviewData.isSummaryLoading &&
    !overviewData.isSummaryError
  ) {
    initialSortRef.current = {
      column: 'created_at',
      direction: 'descending',
    };
  }

  const [serviceSortDescriptor, setServiceSortDescriptor] =
    useState<SortDescriptor | null>(null);
  const [deploymentSortDescriptor, setDeploymentSortDescriptor] =
    useState<SortDescriptor | null>(null);
  const [filter, setFilter] = useState('');

  const linkParams = useMemo(() => {
    const next = new URLSearchParams();
    for (const key of PRESERVE_PARAMS) {
      const value = searchParams.get(key);
      if (value != null) next.set(key, value);
    }
    const rangeFilter = rangeFilters[0];
    if (rangeFilter?.type === 'DATE') {
      const afterParams = toCreatedAfterParam(rangeFilter.value);
      for (const [key, value] of afterParams) {
        next.set(key, value);
      }
    }
    return next;
  }, [rangeFilters, searchParams]);

  const resolvedServiceSortDescriptor = serviceSortDescriptor ??
    initialSortRef.current ?? { column: 'created_at', direction: 'descending' };
  const resolvedDeploymentSortDescriptor = deploymentSortDescriptor ?? {
    column: 'created_at',
    direction: 'descending',
  };

  const value = useMemo(
    () => ({
      ...overviewData,
      isSummaryLoading,
      baseUrl,
      filter,
      setFilter,
      linkParams,
      resolvedServiceSortDescriptor,
      resolvedDeploymentSortDescriptor,
      setServiceSortDescriptor,
      setDeploymentSortDescriptor,
      mode,
      triggerManualRefresh,
    }),
    [
      overviewData,
      isSummaryLoading,
      baseUrl,
      filter,
      linkParams,
      resolvedServiceSortDescriptor,
      resolvedDeploymentSortDescriptor,
      mode,
      triggerManualRefresh,
    ],
  );

  return (
    <OverviewContext.Provider value={value}>
      {children}
    </OverviewContext.Provider>
  );
}

export function useOverviewContext() {
  return use(OverviewContext);
}
