import invariant from 'tiny-invariant';
import { clientAction } from './action';
import { useEnvironmentParam } from '@restate/features/cloud/routes-utils';
import { CLI } from './Cli';
import { Http } from './Http';
import { ApiKeys } from './ApiKeys';
import { clientLoader } from './loader';
import { Security } from './Security';

function Component() {
  const environmentId = useEnvironmentParam();
  invariant(environmentId, 'Missing environmentId param');

  return (
    <div className="flex flex-col gap-10">
      <CLI />
      <Http />
      <ApiKeys />
      <Security />
    </div>
  );
}

export const settings = { clientAction, clientLoader, Component };
