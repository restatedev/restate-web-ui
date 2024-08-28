import { ClientActionFunctionArgs, redirect } from '@remix-run/react';
import {
  createEnvironment,
  destroyEnvironment,
} from '@restate/data-access/cloud/api-client';
import invariant from 'tiny-invariant';

// TODO: Error handling, Pending UI
export const clientAction = async ({
  request,
  params,
}: ClientActionFunctionArgs) => {
  const { accountId } = params;
  invariant(accountId, 'Missing accountId param');

  switch (request.method) {
    case 'POST': {
      try {
        const body = await request.formData();

        // TODO: fix typing issue
        const name = body.get('name') as string;
        const { data, error } = await createEnvironment({
          accountId,
          name,
        });

        if (error) {
          return { errors: [new Error(error.message)] };
        }
        return redirect(
          `/accounts/${params.accountId}/environments/${data?.environmentId}`
        );
      } catch (error) {
        return { errors: [new Error('Oh no! Something went wrong!')] };
      }
    }
    case 'DELETE': {
      const body = await request.formData();

      // TODO: fix typing issue
      const environmentId = body.get('environmentId') as string;
      // TODO: fix typing issue
      const { error } = await destroyEnvironment({ accountId, environmentId });
      if (error) {
        return { errors: [new Error(error.message)] };
      }
      return redirect(`/accounts/${params.accountId}/environments`);
    }

    default:
      break;
  }
};
