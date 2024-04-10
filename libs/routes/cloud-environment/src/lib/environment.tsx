import {
  ClientLoaderFunctionArgs,
  redirect,
  ClientActionFunctionArgs,
  useLoaderData,
  useParams,
  NavLink,
  Form,
  Outlet,
  useActionData,
} from '@remix-run/react';
import {
  listEnvironments,
  createEnvironment,
  isRole,
  createApiKey,
  describeEnvironment,
  listApiKeys,
  describeApiKey,
} from '@restate/data-access/cloud-api-client';
import { Button } from '@restate/ui/button';
import invariant from 'tiny-invariant';

const clientLoader = async ({ request, params }: ClientLoaderFunctionArgs) => {
  const accountId = params.accountId;
  const environmentId = params.environmentId;
  invariant(accountId, 'Missing accountId param');
  invariant(environmentId, 'Missing environmentId param');
  const { data: environment } = await describeEnvironment({
    accountId,
    environmentId,
  });
  const { data: apiKeysResponse } = await listApiKeys({
    accountId,
    environmentId,
  });

  const apiKeys = apiKeysResponse?.apiKeys ?? [];
  const detailedApiKeys = await Promise.all(
    apiKeys.map(({ keyId }) =>
      describeApiKey({
        accountId,
        environmentId,
        keyId,
      })
    )
  );

  return { environment, apiKeys: detailedApiKeys };
};

// TODO: Error handling, Pending UI
const clientAction = async ({ request, params }: ClientActionFunctionArgs) => {
  const body = await request.formData();
  const roleId = body.get('roleId');
  const _action = body.get('_action');

  if (_action === 'createAPIKey') {
    invariant(params.accountId, 'Missing accountId param');
    invariant(params.environmentId, 'Missing environmentId param');
    invariant(isRole(roleId), 'Missing roleId param');

    const { data } = await createApiKey({
      accountId: params.accountId,
      environmentId: params.environmentId,
      roleId,
    });
    return data;
  }

  return null;
};

function Component() {
  const { environment, apiKeys } = useLoaderData<typeof clientLoader>();

  return (
    <div>
      <ul>
        {apiKeys.map((key) => (
          <li key={key.data?.apiKey}>{key.data?.apiKey}</li>
        ))}
      </ul>
      <Form method="post">
        <div>
          <label
            htmlFor="roleId"
            className="block text-sm font-medium leading-6 text-gray-900"
          >
            Role
          </label>
          <select
            name="roleId"
            id="roleId"
            className="text-xs shadow-sm font-sans font-semibold mt-2 block rounded border-0 py-1 pl-2 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-xs sm:leading-4"
          >
            <option value="rst:role::FullAccess">Full Access</option>
            <option value="rst:role::IngressAccess">Ingress Access</option>
            <option value="rst:role::AdminAccess">Admin Access</option>
            <option value="rst:role::ResolveAwakeableAccess">
              Resolve Awakeable Access
            </option>
          </select>
          <Button type="submit">Create API Key</Button>
        </div>
      </Form>
    </div>
  );
}

export const environment = { clientAction, clientLoader, Component };
