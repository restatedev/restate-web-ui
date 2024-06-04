import {
  PropsWithChildren,
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';
import { clientLoader } from './loader';
import { useLoaderData } from '@remix-run/react';
import { useEnvironmentParam } from '@restate/features/cloud/routes-utils';
import { getAccessToken } from '@restate/util/auth';

const EnvironmentStatusContext = createContext<Record<string, Status>>({});
export type Status =
  | 'PENDING'
  | 'ACTIVE'
  | 'HEALTHY'
  | 'FAILED'
  | 'DELETED'
  | 'DEGRADED';

const IS_HEALTH_CHECK_ACTIVE = false;

export function EnvironmentStatusProvider({
  children,
}: PropsWithChildren<NonNullable<unknown>>) {
  const loaderResponse = useLoaderData<typeof clientLoader>();
  const [allStatus, setAllStatus] = useState<Record<string, Status>>({});
  const currentEnvironmentId = useEnvironmentParam();
  const currentStatus = currentEnvironmentId
    ? allStatus[currentEnvironmentId]
    : undefined;
  const [currentAdminBaseUrl, setCurrentAdminBaseUrl] = useState<string>();

  useEffect(() => {
    const { environmentList, ...environmentsWithDetailsPromises } =
      loaderResponse;
    const abortController = new AbortController();
    let cancelled = false;

    environmentList.data?.environments.forEach((environment) => {
      environmentsWithDetailsPromises[environment.environmentId]?.then(
        ({ data }) => {
          if (data) {
            setAllStatus((s) => ({ ...s, [data.environmentId]: data.status }));
            if (data.status === 'ACTIVE' && IS_HEALTH_CHECK_ACTIVE) {
              fetch(`${data.adminBaseUrl}/health`, {
                headers: {
                  Authorization: `Bearer ${getAccessToken()}`,
                },
                signal: abortController.signal,
              }).then((res) => {
                if (!cancelled) {
                  setAllStatus((s) => ({
                    ...s,
                    [data.environmentId]: res.ok ? 'HEALTHY' : 'DEGRADED',
                  }));
                  if (currentEnvironmentId === data.environmentId) {
                    setCurrentAdminBaseUrl(data.adminBaseUrl);
                  }
                }
              });
            }
          }
        }
      );
    });
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
            }).then((res) => {
              if (!cancelled) {
                setAllStatus((s) => ({
                  ...s,
                  [currentEnvironmentId]: res.ok ? 'HEALTHY' : 'DEGRADED',
                }));
                timeoutId = healthCheck();
              }
            });
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
  }, [
    currentEnvironmentId,
    loaderResponse,
    currentStatus,
    currentAdminBaseUrl,
  ]);

  return (
    <EnvironmentStatusContext.Provider value={allStatus}>
      {children}
    </EnvironmentStatusContext.Provider>
  );
}

export function useEnvironmentStatus(environmentId: string) {
  const statues = useContext(EnvironmentStatusContext);
  return statues[environmentId];
}
