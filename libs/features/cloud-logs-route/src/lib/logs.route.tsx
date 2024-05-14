import {
  Await,
  useLoaderData,
  useNavigation,
  useSearchParams,
} from '@remix-run/react';
import { clientLoader } from './loader';
import { Suspense } from 'react';
import { LogsViewer } from './LogsViewer';
import { GranularitySelector } from './GranularitySelector';
import { Spinner } from '@restate/ui/button';
import { useEnvironmentParam } from '@restate/features/cloud/routes-utils';
import {
  LOGS_GRANULARITY_QUERY_PARAM_NAME,
  LogsGranularity,
} from './LogsGranularity';

export function Component() {
  const { logsPromise } = useLoaderData<typeof clientLoader>();
  const { state } = useNavigation();
  const environmentId = useEnvironmentParam();
  const [searchParams] = useSearchParams();
  const isLiveLogsEnabled =
    searchParams.get(LOGS_GRANULARITY_QUERY_PARAM_NAME) ===
    LogsGranularity.Live;

  const loading = (
    <p className="font-sans flex gap-2 p-3 items-center text-sm py-4">
      <Spinner />
      Loading logs...
    </p>
  );

  return (
    <div className="flex-auto flex flex-col">
      <div className="grid sm:auto-cols-auto sm:[grid-template-columns:1fr_auto] grid-cols-1 items-start sm:items-center flex-wrap gap-x-2">
        <h2 className="text-base font-semibold leading-7 text-gray-900">
          Logs
        </h2>
        <div className="mt-2 sm:mt-0">
          <GranularitySelector />
        </div>
        <p className="mt-1 flex-auto w-full text-sm leading-6 text-gray-600 row-start-2">
          You can access the restate server logs here.
        </p>
      </div>
      <div className="overflow-auto relative flex-auto text-xs font-mono mt-4 whitespace-pre-wrap rounded-xl border bg-gray-200/50 shadow-[inset_0_1px_0px_0px_rgba(0,0,0,0.03)]">
        <div className="absolute inset-4">
          {state === 'loading' && loading}
          {state === 'idle' && (
            <Suspense fallback={loading} key={environmentId}>
              <Await resolve={logsPromise}>
                <LogsViewer />
              </Await>
              {isLiveLogsEnabled && (
                <p className="font-sans flex gap-2 p-3 items-center text-sm py-4 text-gray-400">
                  <Spinner />
                  Waiting for logs...
                </p>
              )}
            </Suspense>
          )}
          <div className="h-4" />
        </div>
      </div>
    </div>
  );
}

export const logs = { clientLoader, Component };
