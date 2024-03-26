import {
  ClientActionFunctionArgs,
  ClientLoaderFunctionArgs,
} from '@remix-run/react';
import {
  createEnvironment,
  listEnvironments,
} from '@restate/data-access/cloud-api-client';
import invariant from 'tiny-invariant';

export const clientLoader = async ({
  request,
  params,
  serverLoader,
}: ClientLoaderFunctionArgs) => {
  invariant(params.accountId, 'Missing accountId param');

  const { data } = await listEnvironments({ accountId: params.accountId });
  return data;
};

export const clientAction = async ({
  request,
  params,
  serverAction,
}: ClientActionFunctionArgs) => {
  invariant(params.accountId, 'Missing accountId param');

  const { data } = await createEnvironment({ accountId: params.accountId });
  return data;
};
