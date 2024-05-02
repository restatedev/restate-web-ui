import { ClientActionFunctionArgs, redirect } from '@remix-run/react';
import {
  isRole,
  createApiKey,
  deleteApiKey,
} from '@restate/data-access/cloud/api-client';
import invariant from 'tiny-invariant';
import { listApiKeysWithCache } from './apis';

// TODO: Error handling, Pending UI
export const clientAction = async ({
  request,
  params,
}: ClientActionFunctionArgs) => {
  const body = await request.formData();
  const action = body.get('_action');
  invariant(params.accountId, 'Missing accountId param');
  invariant(params.environmentId, 'Missing environmentId param');
  listApiKeysWithCache.invalidate({
    accountId: params.accountId,
    environmentId: params.environmentId,
  });

  if (action === 'createApiKey') {
    const roleId = body.get('roleId');
    invariant(isRole(roleId), 'Missing roleId param');

    const { data } = await createApiKey({
      accountId: params.accountId,
      environmentId: params.environmentId,
      roleId,
    });
    return data;
  }
  if (action === 'deleteApiKey') {
    const keyId = body.get('keyId');
    invariant(typeof keyId === 'string', 'Missing keyId');

    const { error } = await deleteApiKey({
      accountId: params.accountId,
      environmentId: params.environmentId,
      keyId,
    });
    if (error) {
      return null;
    } else {
      return redirect(
        `/accounts/${params.accountId}/environments/${params.environmentId}/settings`
      );
    }
  }

  return null;
};
