import {
  ClientLoaderFunctionArgs,
  ClientActionFunctionArgs,
  useLoaderData,
  Form,
  defer,
  Await,
} from '@remix-run/react';
import {
  isRole,
  createApiKey,
  describeEnvironment,
  listApiKeys,
  describeApiKey,
} from '@restate/data-access/cloud/api-client';
import { Button } from '@restate/ui/button';
import { FormFieldLabel } from '@restate/ui/form-field';
import { Radio, RadioGroup } from '@restate/ui/radio-group';
import { Suspense } from 'react';
import invariant from 'tiny-invariant';

const clientLoader = async ({ request, params }: ClientLoaderFunctionArgs) => {
  const accountId = params.accountId;
  const environmentId = params.environmentId;
  invariant(accountId, 'Missing accountId param');
  invariant(environmentId, 'Missing environmentId param');

  const environmentPromise = describeEnvironment({
    accountId,
    environmentId,
  });

  const apiKeysWithDetailsPromises = listApiKeys({
    accountId,
    environmentId,
  }).then((response) => {
    const apiKeys = response.data?.apiKeys ?? [];
    return apiKeys
      .map(({ keyId }) => ({
        [keyId]: describeApiKey({
          accountId,
          environmentId,
          keyId,
        }),
      }))
      .reduce((p, c) => ({ ...p, ...c }), {});
  });

  return defer({
    environmentPromise,
    apiKeysWithDetailsPromises,
  });
};

// TODO: Error handling, Pending UI
const clientAction = async ({ request, params }: ClientActionFunctionArgs) => {
  const body = await request.formData();
  const action = body.get('action');

  if (action === 'createApiKey') {
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
  }

  return null;
};

function Component() {
  const { apiKeysWithDetailsPromises } = useLoaderData<typeof clientLoader>();

  return (
    <div>
      <Suspense fallback={<p>loading list</p>}>
        <Await resolve={apiKeysWithDetailsPromises}>
          {(apiKeysWithDetails) => (
            <ul>
              {Object.keys(apiKeysWithDetails).map((keyId) => (
                <li key={keyId}>
                  <Suspense fallback={<p>loading key</p>}>
                    <Await
                      resolve={apiKeysWithDetails[keyId]}
                      errorElement={<p>failed key</p>}
                    >
                      {(apiKeyDetails) => (
                        <p>
                          {apiKeyDetails?.data?.keyId}:
                          {apiKeyDetails?.data?.roleId}
                        </p>
                      )}
                    </Await>
                  </Suspense>
                </li>
              ))}
            </ul>
          )}
        </Await>
      </Suspense>

      <Form method="post">
        <RadioGroup name="roleId">
          <FormFieldLabel>Role</FormFieldLabel>
          <Radio value="rst:role::FullAccess">Full Access</Radio>
          <Radio value="rst:role::IngressAccess">Ingress Access</Radio>
          <Radio value="rst:role::AdminAccess">Admin Access</Radio>
          <Radio value="rst:role::ResolveAwakeableAccess">
            Resolve Awakeable Access
          </Radio>
        </RadioGroup>
        <Button type="submit" name="action" value="createApiKey">
          Create API Key
        </Button>
      </Form>
    </div>
  );
}

export const apiKeys = { clientAction, clientLoader, Component };
