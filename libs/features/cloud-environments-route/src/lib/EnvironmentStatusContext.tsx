import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useDeferredValue,
  useEffect,
  useState,
} from 'react';
import { clientLoader } from './loader';
import { useLoaderData } from '@remix-run/react';
import {
  useAccountParam,
  useEnvironmentParam,
} from '@restate/features/cloud/routes-utils';
import { HideNotification, LayoutOutlet, LayoutZone } from '@restate/ui/layout';
import { Button } from '@restate/ui/button';
import { Icon, IconName } from '@restate/ui/icons';
import { adminApi } from '@restate/data-access/admin-api';
import { useQueries, useQuery } from '@tanstack/react-query';

const EnvironmentStatusContext = createContext<Record<string, Status>>({});
export type Status =
  | 'PENDING'
  | 'ACTIVE'
  | 'HEALTHY'
  | 'FAILED'
  | 'DELETED'
  | 'DEGRADED';

export function EnvironmentStatusProvider({
  children,
}: PropsWithChildren<NonNullable<unknown>>) {
  const loaderResponse = useLoaderData<typeof clientLoader>();
  const [allStatus, setAllStatus] = useState<Record<string, Status>>({});
  const currentEnvironmentId = useEnvironmentParam();
  const currentAccountId = useAccountParam();
  const currentStatus = currentEnvironmentId
    ? allStatus[currentEnvironmentId]
    : undefined;

  const setStatus = useCallback((environmentId: string, status: Status) => {
    setAllStatus((s) => ({
      ...s,
      [environmentId]: status,
    }));
  }, []);
  const results = useQueries({
    queries: (loaderResponse.environmentList.data?.environments ?? []).map(
      ({ environmentId }) => ({
        ...adminApi(
          '/health',
          'get',
          `/api/accounts/${currentAccountId}/environments/${environmentId}/admin`
        ),
        refetchOnMount: false,
        enabled: allStatus[environmentId] === 'ACTIVE',
      })
    ),
    combine(result) {
      return result.reduce((p, c, i) => {
        const environmentId =
          loaderResponse.environmentList.data!.environments.at(
            i
          )?.environmentId;
        if (environmentId && c.isFetched) {
          const status: Status = c.isSuccess ? 'HEALTHY' : 'DEGRADED';
          return {
            ...p,
            [environmentId]: status,
          };
        }
        return p;
      }, allStatus as Record<string, Status>);
    },
  });

  const { isSuccess, isError } = useQuery({
    ...adminApi(
      '/health',
      'get',
      `/api/accounts/${currentAccountId}/environments/${currentEnvironmentId}/admin`
    ),
    refetchOnMount: false,
    enabled:
      !!currentStatus &&
      ['ACTIVE', 'HEALTHY', 'DEGRADED'].includes(currentStatus),
    refetchInterval: currentStatus === 'HEALTHY' ? 60000 : 10000,
  });

  const newStatus = isSuccess ? 'HEALTHY' : isError ? 'DEGRADED' : undefined;
  if (newStatus && newStatus !== currentStatus && currentEnvironmentId) {
    setStatus(currentEnvironmentId, newStatus);
  }

  useEffect(() => {
    const { environmentList, ...environmentsWithDetailsPromises } =
      loaderResponse;
    let cancelled = false;

    environmentList.data?.environments.forEach((environment) => {
      environmentsWithDetailsPromises[environment.environmentId]?.then(
        ({ data }) => {
          if (data && !cancelled) {
            setAllStatus((s) => {
              const currentValue = s[data.environmentId];
              if (!currentValue) {
                return {
                  ...s,
                  [data.environmentId]: data.status,
                };
              } else {
                return s;
              }
            });
          }
        }
      );
    });
    return () => {
      cancelled = true;
    };
  }, [loaderResponse]);

  return (
    <EnvironmentStatusContext.Provider value={results}>
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
