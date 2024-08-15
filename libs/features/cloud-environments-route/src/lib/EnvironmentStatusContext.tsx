import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useDeferredValue,
  useState,
} from 'react';
import {
  useAccountParam,
  useEnvironmentParam,
} from '@restate/features/cloud/routes-utils';
import { HideNotification, LayoutOutlet, LayoutZone } from '@restate/ui/layout';
import { Button } from '@restate/ui/button';
import { Icon, IconName } from '@restate/ui/icons';
import { adminApi } from '@restate/data-access/admin-api';
import {
  Query,
  useQueries,
  useQuery,
  UseQueryResult,
} from '@tanstack/react-query';
import { cloudApi, Environment } from '@restate/data-access/cloud/api-client';
import invariant from 'tiny-invariant';

const EnvironmentStatusContext = createContext<Record<string, Status>>({});
export type Status =
  | 'PENDING'
  | 'ACTIVE'
  | 'HEALTHY'
  | 'FAILED'
  | 'DELETED'
  | 'DEGRADED';

function toAllEnvironmentsStatus(result: UseQueryResult<Environment, Error>[]) {
  return result.reduce((allStatus, envDetails) => {
    if (envDetails.data) {
      return {
        ...allStatus,
        [envDetails.data?.environmentId]: envDetails.data?.status,
      };
    }
    return allStatus;
  }, {} as Record<string, Status>);
}

export function EnvironmentStatusProvider({
  children,
}: PropsWithChildren<NonNullable<unknown>>) {
  const accountId = useAccountParam();
  invariant(accountId, 'Missing accountId');
  const currentEnvironmentId = useEnvironmentParam();
  const { data: environmentList } = useQuery({
    ...cloudApi.listEnvironments({ accountId: accountId! }),
  });
  const environments = environmentList?.environments ?? [];

  const allEnvironmentsStatus = useQueries({
    queries: environments.map(({ environmentId }) => ({
      ...cloudApi.describeEnvironment({
        accountId,
        environmentId,
      }),
    })),
    combine: toAllEnvironmentsStatus,
  });

  const toAllEnvironmentsStatusWithHealth = useCallback(
    (result: UseQueryResult<unknown, unknown>[]) => {
      return result.reduce((allHealthStatus, healthResponse, i) => {
        const environmentId = environments.at(i)?.environmentId;
        if (environmentId && healthResponse.isFetched) {
          const status: Status = healthResponse.isSuccess
            ? 'HEALTHY'
            : 'DEGRADED';
          return {
            ...allHealthStatus,
            [environmentId]: status,
          };
        }
        return allHealthStatus;
      }, allEnvironmentsStatus as Record<string, Status>);
    },
    [environments, allEnvironmentsStatus]
  );

  const allEnvironmentsStatusWithHealth = useQueries({
    queries: environments.map(({ environmentId }) => ({
      ...adminApi(
        '/health',
        'get',
        `/api/accounts/${accountId}/environments/${environmentId}/admin`
      ),
      enabled: allEnvironmentsStatus[environmentId] === 'ACTIVE',
      refetchInterval: (query: Query) => {
        const url = query.queryKey.at(0);
        const isCurrentEnvQuery =
          typeof url === 'string' && url.includes(environmentId);

        if (isCurrentEnvQuery) {
          return query.state.status === 'success' ? 60000 : 10000;
        }
        return false;
      },
    })),
    combine: toAllEnvironmentsStatusWithHealth,
  });
  const currentStatus = currentEnvironmentId
    ? allEnvironmentsStatusWithHealth[currentEnvironmentId]
    : undefined;

  return (
    <EnvironmentStatusContext.Provider value={allEnvironmentsStatusWithHealth}>
      {children}
      <EnvironmentDegraded
        status={currentStatus}
        key={`${currentStatus}${currentEnvironmentId}`}
      />
    </EnvironmentStatusContext.Provider>
  );
}

export function useEnvironmentStatus(environmentId: string) {
  const statues = useContext(EnvironmentStatusContext);
  return statues[environmentId];
}

function EnvironmentDegraded({ status }: { status?: Status }) {
  const isDegraded = status === 'DEGRADED';
  const deferredIsDegraded = useDeferredValue(isDegraded);
  const [canBeOpened, setCanBeOpened] = useState(true);
  const deferredCanBeOpened = useDeferredValue(canBeOpened);

  if (deferredIsDegraded && deferredCanBeOpened) {
    return (
      <LayoutOutlet zone={LayoutZone.Notification}>
        <div className="flex items-center gap-2 bg-orange-100 rounded-xl bg-orange-200/60 shadow-lg shadow-zinc-800/5 border border-orange-200 text-orange-800 px-3 text-sm">
          <Icon
            name={IconName.TriangleAlert}
            className="w-4 h-4 fill-current2"
          />{' '}
          Your Restate environment is currently experiencing issues.
          <Button
            variant="icon"
            className="ml-auto"
            onClick={(event) => {
              event.target.dataset.variant = 'hidden';
              setTimeout(() => {
                setCanBeOpened(false);
              }, 100);
            }}
          >
            <Icon name={IconName.X} />
          </Button>
        </div>
        {(!isDegraded || !canBeOpened) && <HideNotification />}
      </LayoutOutlet>
    );
  }

  return null;
}
