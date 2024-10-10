import { ClientActionFunctionArgs, redirect } from '@remix-run/react';
import { createAccount } from '@restate/data-access/cloud/api-client';

// TODO: Error handling, Pending UI
export const clientAction = async ({
  request,
  params,
}: ClientActionFunctionArgs) => {
  const body = await request.formData();
  // TODO: fix typing issue
  const name = body.get('name') as string;
  const { data, error } = await createAccount({
    name,
  });
  if (error) {
    return { errors: [new Error(error.message)] };
  }
  return redirect(`/accounts/${data?.accountId}/environments`);
};
