import { clientAction } from './action';
import { CLI } from './Cli';
import { Http } from './Http';
import { ApiKeys } from './ApiKeys';
import { clientLoader } from './loader';
import { Security } from './Security';
import { ErrorFetchingEnvironmentDetails } from './ErrorFetchingEnvironmentDetails';
import { useFetcher } from '@remix-run/react';
import { useAccountParam } from '@restate/features/cloud/routes-utils';
import { Plan } from './Plan';
import { Delete } from './Delete';

function Component() {
  const accountId = useAccountParam();
  const { load, state } = useFetcher({ key: 'describeEnvironment' });
  const isLoading = state === 'loading';

  return (
    <div className="flex flex-col gap-10">
      <ErrorFetchingEnvironmentDetails
        isLoading={isLoading}
        retry={() => load(`/accounts/${accountId}/environments`)}
      />
      <CLI isLoading={isLoading} />
      <ApiKeys isLoading={isLoading} />
      <Http isLoading={isLoading} />
      <Security isLoading={isLoading} />
      <Plan isLoading={isLoading} />
      <Delete isLoading={isLoading} />
    </div>
  );
}

export const settings = { clientAction, clientLoader, Component };
