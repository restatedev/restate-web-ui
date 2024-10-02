import {
  ActionFunctionArgs,
  json,
  LoaderFunctionArgs,
} from '@remix-run/cloudflare';
import {
  describeEnvironment,
  destroyEnvironment,
} from '@restate/data-access/cloud/api-client';
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
    case 'DELETE': {
      const { data, error, response } = await destroyEnvironment({
        accountId,
        environmentId,
        headers: request.headers,
      });

      if (data) {
        return json({});
      } else {
        return new Response(JSON.stringify({ errors: [error] }), {
          status: response.status,
          headers: { 'content-type': 'application/json' },
        });
      }
    }

    default:
      return json({}, { status: 501 });
  }
};

export const loader = async ({
  request,
  params,
  context,
}: LoaderFunctionArgs) => {
  const accountId = params.accountId;
  const environmentId = params.environmentId;
  invariant(accountId, 'Missing accountId param');
  invariant(environmentId, 'Missing environmentId param');

  switch (request.method) {
    case 'GET': {
      const { data, response, error } = await describeEnvironment({
        accountId,
        environmentId,
        headers: request.headers,
      });

      if (data) {
        return json(data);
      } else {
        return new Response(JSON.stringify({ errors: [error] }), {
          status: response.status,
          headers: { 'content-type': 'application/json' },
        });
      }
    }

    default:
      return new Response('', { status: 501 });
  }
};
