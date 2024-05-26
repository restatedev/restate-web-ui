import { ClientActionFunctionArgs, redirect } from '@remix-run/react';
import {
  isRole,
  createApiKey,
  deleteApiKey,
} from '@restate/data-access/cloud/api-client';
import { describeEnvironmentWithCache } from '@restate/features/cloud/environments-route';
import invariant from 'tiny-invariant';
import { describeApiKeyWithCache } from './apis';

// TODO: Error handling, Pending UI
export const clientAction = async ({
  request,
  params,
}: ClientActionFunctionArgs) => {
  const body = await request.formData();
  const action = body.get('_action');
  invariant(params.accountId, 'Missing accountId param');
  invariant(params.environmentId, 'Missing environmentId param');
  describeEnvironmentWithCache.invalidate({
    accountId: params.accountId,
    environmentId: params.environmentId,
  });

  if (action === 'createApiKey') {
    const roleId = body.get('roleId');
    const description = body.get('description');
    invariant(isRole(roleId), 'Missing roleId param');

    const { data, error } = await createApiKey({
      accountId: params.accountId,
      environmentId: params.environmentId,
      roleId,
      ...(typeof description === 'string' && { description }),
    });
    if (error) {
      return { errors: [new Error(error.message)] };
    }
    return data;
  }
  if (action === 'deleteApiKey') {
    const keyId = body.get('keyId');
    invariant(typeof keyId === 'string', 'Missing keyId');
    describeApiKeyWithCache.invalidate({
      accountId: params.accountId,
      environmentId: params.environmentId,
      keyId,
    });

    const { error } = await deleteApiKey({
      accountId: params.accountId,
      environmentId: params.environmentId,
      keyId,
    });
    if (error) {
      return { errors: [new Error(error.message)] };
    } else {
      return redirect(
        `/accounts/${params.accountId}/environments/${params.environmentId}/settings`
      );
    }
  }

  return null;
};
