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

export function EnvironmentStatusProvider({
  children,
}: PropsWithChildren<NonNullable<unknown>>) {
  const loaderResponse = useLoaderData<typeof clientLoader>();
  const [allStatus, setAllStatus] = useState<Record<string, Status>>({});
  const currentEnvironmentId = useEnvironmentParam();

  useEffect(() => {
    const { environmentList, ...environmentsWithDetailsPromises } =
      loaderResponse;

    environmentList.data?.environments.forEach((environment) => {
      environmentsWithDetailsPromises[environment.environmentId]?.then(
        ({ data }) => {
          if (data) {
            setAllStatus((s) => ({ ...s, [data.environmentId]: data.status }));
            if (data.status === 'ACTIVE') {
              fetch(`${data.adminBaseUrl}/health`, {
                headers: {
                  Authorization: `Bearer ${getAccessToken()}`,
                },
              }).then((res) => {
                setAllStatus((s) => ({
                  ...s,
                  [data.environmentId]: res.ok ? 'HEALTHY' : 'DEGRADED',
                }));
              });
            }
          }
        }
      );
    });
  }, [loaderResponse]);

  useEffect(() => {
    let cancelled = false;
    const abortController = new AbortController();
    let intervalId: ReturnType<typeof setInterval> | null = null;
    const { environmentList, ...environmentsWithDetailsPromises } =
      loaderResponse;

    const currentEnvironmentDetailsPromise = currentEnvironmentId
      ? environmentsWithDetailsPromises[currentEnvironmentId]
      : undefined;

    if (currentEnvironmentDetailsPromise) {
      currentEnvironmentDetailsPromise.then(({ data }) => {
        if (
          data &&
          data.status === 'ACTIVE' &&
          currentEnvironmentId === data.environmentId
        ) {
          intervalId = setInterval(() => {
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
              }
            });
          }, 60000);
        }
      });
    }

    return () => {
      cancelled = true;
      abortController.abort();
      intervalId && clearInterval(intervalId);
    };
  }, [currentEnvironmentId, loaderResponse]);

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
