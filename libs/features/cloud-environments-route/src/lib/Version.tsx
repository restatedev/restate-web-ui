import { Await, useAsyncValue, useLoaderData } from '@remix-run/react';
import { clientLoader } from './loader';
import { useEnvironmentParam } from '@restate/features/cloud/routes-utils';
import { Suspense, useEffect, useState } from 'react';
import { describeEnvironment } from '@restate/data-access/cloud/api-client';
import { getAccessToken } from '@restate/util/auth';

export function Version() {
  const { environmentList, ...environmentsWithDetailsPromises } =
    useLoaderData<typeof clientLoader>();
  const environmentId = useEnvironmentParam();

  const environmentDetailsPromise = environmentId
    ? environmentsWithDetailsPromises[environmentId]
    : null;
  return (
    <Suspense>
      <Await resolve={environmentDetailsPromise}>
        <VersionFetcher />
      </Await>
    </Suspense>
  );
}

function VersionFetcher() {
  const environmentDetails = useAsyncValue() as Awaited<
    ReturnType<typeof describeEnvironment>
  >;
  const [version, setVersion] = useState('');

  useEffect(() => {
    let cancelled = false;
    const url = environmentDetails?.data?.adminBaseUrl;
    const abortController = new AbortController();
    if (url) {
      fetch(`${url}/openapi`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAccessToken()}`,
          Accept: 'application/json',
        },
        signal: abortController.signal,
      })
        .then((res) => res.json())
        .then((res) => {
          if (!cancelled) {
            setVersion(res?.info?.version ?? '');
          }
        });
    }

    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [environmentDetails]);

  if (!version) {
    return null;
  }

  return (
    <span className="text-2xs font-mono items-center rounded-xl px-2 leading-4 bg-white/50 ring-1 ring-inset ring-gray-500/20 text-gray-500 mt-0.5">
      v{version}
    </span>
  );
}
