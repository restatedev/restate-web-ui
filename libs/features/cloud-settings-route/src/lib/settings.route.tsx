import invariant from 'tiny-invariant';
import { clientAction } from './action';
import { useEnvironmentParam } from '@restate/features/cloud/routes-utils';
import { CLI } from './Cli';
import { Http } from './Http';
import { ApiKeys } from './ApiKeys';
import { clientLoader } from './loader';
import { Security } from './Security';
import { ErrorFetchingEnvironmentDetails } from './ErrorFetchingEnvironmentDetails';
import { useNavigation } from '@remix-run/react';

function Component() {
  const { state } = useNavigation();
  const isLoading = state === 'loading';

  return (
    <div className="flex flex-col gap-10">
      <ErrorFetchingEnvironmentDetails isLoading={isLoading} />
      <CLI isLoading={isLoading} />
      <Http isLoading={isLoading} />
      <ApiKeys isLoading={isLoading} />
      <Security isLoading={isLoading} />
    </div>
  );
}

export const settings = { clientAction, clientLoader, Component };
