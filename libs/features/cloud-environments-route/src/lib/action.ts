import { ClientActionFunctionArgs, redirect } from '@remix-run/react';
import {
  createEnvironment,
  destroyEnvironment,
} from '@restate/data-access/cloud/api-client';
import invariant from 'tiny-invariant';
import { listEnvironmentsWithCache } from './apis';

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
        listEnvironmentsWithCache.invalidate({ accountId });

        const body = await request.formData();

        // TODO: fix typing issue
        const description = body.get('description') as string;
        const { data, error } = await createEnvironment({
          accountId,
          description,
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
      listEnvironmentsWithCache.invalidate({ accountId });
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
