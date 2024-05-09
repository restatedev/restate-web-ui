import { Await, useLoaderData } from '@remix-run/react';
import { clientLoader } from './loader';
import { Suspense } from 'react';
import { LogsViewer } from './LogsViewer';
import { GranularitySelector } from './GranularitySelector';

export function Component() {
  const { logsPromise } = useLoaderData<typeof clientLoader>();

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
      <Suspense fallback={<p>loading</p>}>
        <Await resolve={logsPromise}>
          <LogsViewer />
        </Await>
      </Suspense>
    </div>
  );
}

export const logs = { clientLoader, Component };
