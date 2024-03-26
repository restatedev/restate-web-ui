import {
  ClientActionFunctionArgs,
  ClientLoaderFunctionArgs,
} from '@remix-run/react';
import {
  createAccount,
  listAccounts,
} from '@restate/data-access/cloud-api-client';

export const clientLoader = async ({
  request,
  params,
  serverLoader,
}: ClientLoaderFunctionArgs) => {
  const { data } = await listAccounts();
  return data;
};

export const clientAction = async ({
  request,
  params,
  serverAction,
}: ClientActionFunctionArgs) => {
  const { data } = await createAccount();
  return data;
};
