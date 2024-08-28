import { ActionFunctionArgs, json } from '@remix-run/cloudflare';
import { createApiKey, isRole } from '@restate/data-access/cloud/api-client';
import invariant from 'tiny-invariant';

export const action = async ({
  request,
  params,
  context,
}: ActionFunctionArgs) => {
  const accountId = params.accountId;
  const environmentId = params.environmentId;
  invariant(accountId, 'Missing accountId param');
  invariant(environmentId, 'Missing environmentId param');

  switch (request.method) {
    case 'POST': {
      const body = await request.formData();
      const roleId = body.get('roleId');
      const description = body.get('description');
      invariant(isRole(roleId), 'Missing roleId param');

      const { data, error, response } = await createApiKey({
        accountId,
        environmentId,
        roleId,
        ...(typeof description === 'string' && { description }),
        headers: {
          cookie: request.headers.get('cookie')!,
        },
      });

      if (data) {
        return json({ ...data, description });
      } else {
        return new Response(JSON.stringify(error), { status: response.status });
      }
    }

    default:
      return json({}, { status: 501 });
  }
};
