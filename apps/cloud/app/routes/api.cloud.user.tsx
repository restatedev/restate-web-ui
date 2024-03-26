import { ClientLoaderFunctionArgs } from '@remix-run/react';
import { getUserIdentity } from '@restate/data-access/cloud-api-client';

export const clientLoader = async ({
  request,
  params,
  serverLoader,
}: ClientLoaderFunctionArgs) => {
  const { data } = await getUserIdentity();
  return data;
};
