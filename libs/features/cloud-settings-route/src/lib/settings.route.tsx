import { CLI } from './Cli';
import { Http } from './Http';
import { ApiKeys } from './ApiKeys';
import { Security } from './Security';
import { ErrorFetchingEnvironmentDetails } from './ErrorFetchingEnvironmentDetails';
import { Plan } from './Plan';
import { Delete } from './Delete';
import { useEnvironmentDetails } from '@restate/features/cloud/environments-route';

function Component() {
  const { isLoading, refetch } = useEnvironmentDetails();

  return (
    <div className="flex flex-col gap-10">
      <ErrorFetchingEnvironmentDetails isLoading={isLoading} retry={refetch} />
      <CLI isLoading={isLoading} />
      <ApiKeys isLoading={isLoading} />
      <Http isLoading={isLoading} />
      <Security isLoading={isLoading} />
      <Plan isLoading={isLoading} />
      <Delete isLoading={isLoading} />
    </div>
  );
}

export const settings = { Component };
