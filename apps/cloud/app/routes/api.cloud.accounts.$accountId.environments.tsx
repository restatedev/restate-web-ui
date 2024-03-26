import {
  ClientActionFunctionArgs,
  ClientLoaderFunctionArgs,
} from '@remix-run/react';
import { createApiKey, isRole } from '@restate/data-access/cloud-api-client';
import invariant from 'tiny-invariant';

export const clientLoader = async ({
  request,
  params,
  serverLoader,
}: ClientLoaderFunctionArgs) => {
  invariant(params.accountId, 'Missing accountId param');
  invariant(params.environmentId, 'Missing environmentId param');

  return [];
};

export const clientAction = async ({
  request,
  params,
  serverAction,
}: ClientActionFunctionArgs) => {
  const body = await request.formData();
  const roleId = body.get('roleId');
  invariant(params.accountId, 'Missing accountId param');
  invariant(params.environmentId, 'Missing environmentId param');
  invariant(isRole(roleId), 'Missing roleId param');

  const { data } = await createApiKey({
    accountId: params.accountId,
    environmentId: params.environmentId,
    roleId,
  });
  return data;
};
