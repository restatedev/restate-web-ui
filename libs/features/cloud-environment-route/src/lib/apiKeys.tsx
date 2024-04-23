import {
  ClientLoaderFunctionArgs,
  ClientActionFunctionArgs,
  useLoaderData,
  Form,
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

  if (_action === 'createApiKey') {
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
  const { apiKeys } = useLoaderData<typeof clientLoader>();

  return (
    <div>
      <ul>
        {apiKeys.map((key) => (
          <li key={key.data?.keyId}>{key.data?.keyId}</li>
        ))}
      </ul>
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
        <Button type="submit" name="_action" value="createApiKey">
          Create API Key
        </Button>
      </Form>
    </div>
  );
}

export const apiKeys = { clientAction, clientLoader, Component };
