import { clientAction } from './action';
import { CLI } from './Cli';
import { Http } from './Http';
import { ApiKeys } from './ApiKeys';
import { clientLoader } from './loader';
import { Security } from './Security';
import { ErrorFetchingEnvironmentDetails } from './ErrorFetchingEnvironmentDetails';
import { useRevalidator } from '@remix-run/react';

function Component() {
  const { state, revalidate } = useRevalidator();
  const isLoading = state === 'loading';

  return (
    <div className="flex flex-col gap-10">
      <ErrorFetchingEnvironmentDetails
        isLoading={isLoading}
        retry={revalidate}
      />
      <CLI isLoading={isLoading} />
      <Http isLoading={isLoading} />
      <ApiKeys isLoading={isLoading} />
      <Security isLoading={isLoading} />
    </div>
  );
}

export const settings = { clientAction, clientLoader, Component };
