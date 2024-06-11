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
import { useEnvironmentParam } from '@restate/features/cloud/routes-utils';
import { getAccessToken } from '@restate/util/auth';
import { HideNotification, LayoutOutlet, LayoutZone } from '@restate/ui/layout';
import { Button } from '@restate/ui/button';
import { Icon, IconName } from '@restate/ui/icons';
import { describeEnvironment } from '@restate/data-access/cloud/api-client';

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
  const [allEnvironmentDetails, setAllEnvironmentDetails] = useState<
    Record<string, Awaited<ReturnType<typeof describeEnvironment>>['data']>
  >({});
  const currentEnvironmentId = useEnvironmentParam();
  const currentStatus = currentEnvironmentId
    ? allStatus[currentEnvironmentId]
    : undefined;
  const [currentAdminBaseUrl, setCurrentAdminBaseUrl] = useState<string>();

  const setStatus = useCallback((environmentId: string, status: Status) => {
    setAllStatus((s) => ({
      ...s,
      [environmentId]: status,
    }));
  }, []);

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
            setAllEnvironmentDetails((s) => ({
              ...s,
              [data.environmentId]: data,
            }));
          }
        }
      );
    });
    return () => {
      cancelled = true;
    };
  }, [loaderResponse]);

  useEffect(() => {
    const { environmentList, ...environmentsWithDetailsPromises } =
      loaderResponse;
    const abortController = new AbortController();
    let cancelled = false;
    if (currentEnvironmentId) {
      environmentsWithDetailsPromises[currentEnvironmentId]?.then(
        ({ data }) => {
          if (data && !cancelled) {
            setCurrentAdminBaseUrl(data.adminBaseUrl);
          }
        }
      );
    }

    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [currentEnvironmentId, loaderResponse]);

  useEffect(() => {
    let cancelled = false;
    let abortController = new AbortController();
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    if (
      currentEnvironmentId &&
      currentStatus &&
      (['HEALTHY', 'DEGRADED'] as Status[]).includes(currentStatus)
    ) {
      const healthCheck = () => {
        if (!abortController.signal.aborted) {
          abortController.abort();
        }
        abortController = new AbortController();
        return setTimeout(
          () => {
            fetch(`${currentAdminBaseUrl}/health`, {
              headers: {
                Authorization: `Bearer ${getAccessToken()}`,
              },
              signal: abortController.signal,
            })
              .then((res) => {
                if (!cancelled) {
                  setAllStatus((s) => ({
                    ...s,
                    [currentEnvironmentId]: res.ok ? 'HEALTHY' : 'DEGRADED',
                  }));
                  timeoutId = healthCheck();
                }
              }) // eslint-disable-next-line @typescript-eslint/no-empty-function
              .catch(() => {});
          },
          currentStatus === 'HEALTHY' ? 60000 : 10000
        );
      };
      timeoutId = healthCheck();
    }

    return () => {
      cancelled = true;
      abortController.abort();
      timeoutId && clearTimeout(timeoutId);
    };
  }, [currentEnvironmentId, currentStatus, currentAdminBaseUrl]);

  return (
    <EnvironmentStatusContext.Provider value={allStatus}>
      {children}
      <EnvironmentDegraded
        status={currentStatus}
        key={`${currentStatus}${currentEnvironmentId}`}
      />
      {loaderResponse.environmentList.data?.environments.map(
        ({ environmentId }) => (
          <EnvironmentStatusFetcher
            environmentId={environmentId}
            adminBaseUrl={allEnvironmentDetails[environmentId]?.adminBaseUrl}
            currentStatus={allEnvironmentDetails[environmentId]?.status}
            setStatus={setStatus}
            key={environmentId}
          />
        )
      )}
    </EnvironmentStatusContext.Provider>
  );
}

function EnvironmentStatusFetcher({
  environmentId,
  currentStatus,
  setStatus,
  adminBaseUrl,
}: {
  environmentId: string;
  adminBaseUrl?: string;
  currentStatus?: Status;
  setStatus: (environmentId: string, status: Status) => void;
}) {
  useEffect(() => {
    const abortController = new AbortController();
    let cancelled = false;

    if (currentStatus === 'ACTIVE' && adminBaseUrl) {
      fetch(`${adminBaseUrl}/health`, {
        headers: {
          Authorization: `Bearer ${getAccessToken()}`,
        },
        signal: abortController.signal,
      })
        .then((res) => {
          if (!cancelled) {
            setStatus(environmentId, res.ok ? 'HEALTHY' : 'DEGRADED');
          }
        }) // eslint-disable-next-line @typescript-eslint/no-empty-function
        .catch(() => {});
    }

    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [adminBaseUrl, currentStatus, environmentId, setStatus]);

  return null;
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
