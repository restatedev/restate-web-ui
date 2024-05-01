import { ClientActionFunctionArgs, redirect } from '@remix-run/react';
import { listAccountsWithCache } from './apis';
import { createAccount } from '@restate/data-access/cloud/api-client';

// TODO: Error handling, Pending UI
export const clientAction = async ({
  request,
  params,
}: ClientActionFunctionArgs) => {
  listAccountsWithCache.invalidate();
  const body = await request.formData();
  // TODO: fix typing issue
  const description = body.get('description') as string;
  const { data } = await createAccount({
    description,
  });
  return redirect(`/accounts/${data?.accountId}/environments`);
};
