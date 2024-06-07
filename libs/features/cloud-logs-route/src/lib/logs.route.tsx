import { Await, useLoaderData, useNavigation } from '@remix-run/react';
import { clientLoader } from './loader';
import { Suspense } from 'react';
import { LogsViewer } from './LogsViewer';
import { GranularitySelector } from './GranularitySelector';
import { Spinner } from '@restate/ui/button';
import { useEnvironmentParam } from '@restate/features/cloud/routes-utils';
import { Icon, IconName } from '@restate/ui/icons';

export function Component() {
  const { logsPromise } = useLoaderData<typeof clientLoader>();
  const { state } = useNavigation();
  const environmentId = useEnvironmentParam();

  const loading = (
    <p className="font-sans flex gap-2 p-8 items-center text-sm">
      <Spinner />
      Loading logs...
    </p>
  );

  return (
    <div className="flex-auto flex flex-col">
      <div className="grid sm:auto-cols-auto sm:[grid-template-columns:1fr_auto] grid-cols-1 items-start sm:items-center flex-wrap gap-x-2">
        <h2 className="text-base font-semibold leading-7 text-gray-900 inline-flex items-center gap-2">
          <Icon
            name={IconName.Log}
            className="w-[1.125em] h-[1.125em] text-gray-700"
          />
          Logs
        </h2>
        <div className="mt-2 sm:mt-0">
          <GranularitySelector />
        </div>
        <p className="mt-1 flex-auto w-full text-sm leading-6 text-gray-600 row-start-2">
          You can access the restate server logs here.
        </p>
      </div>

      <div className="relative flex-auto text-code font-mono mt-4 whitespace-pre-wrap rounded-xl border bg-gray-200/50 shadow-[inset_0_1px_0px_0px_rgba(0,0,0,0.03)]">
        {state === 'loading' && loading}
        {state === 'idle' && (
          <Suspense fallback={loading} key={environmentId}>
            <Await resolve={logsPromise}>
              <LogsViewer />
            </Await>
          </Suspense>
        )}
        <div className="h-4" />
      </div>
    </div>
  );
}

export const logs = { clientLoader, Component };
