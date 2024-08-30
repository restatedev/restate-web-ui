import { Outlet, ShouldRevalidateFunction } from '@remix-run/react';
import { CloudAdminBaseURLProvider } from '@restate/data-access/admin-api';
import { environment } from '@restate/features/cloud/environment-route';
import {
  useEnvironmentParam,
  useAccountParam,
} from '@restate/features/cloud/routes-utils';
import { withCookieAuth } from '@restate/util/auth';
import invariant from 'tiny-invariant';

// TODO
export const loader = withCookieAuth(environment.loader);
//DELETE_ENVIRONMENT_PARAM_NAME
//DELETE_API_KEY_PARAM_NAME
//CREATE_ACCOUNT_PARAM_NAME
//CREATE_API_KEY_PARAM_NAME
export const shouldRevalidate: ShouldRevalidateFunction = ({
  actionResult,
  currentParams,
  currentUrl,
  defaultShouldRevalidate,
  formAction,
  formData,
  formEncType,
  formMethod,
  nextParams,
  nextUrl,
}) => {
  if (
    currentUrl.searchParams.get('createApiKey') !==
      nextUrl.searchParams.get('createApiKey') ||
    currentUrl.searchParams.get('deleteApiKey') !==
      nextUrl.searchParams.get('deleteApiKey') ||
    (!currentUrl.searchParams.get('createEnvironment') &&
      nextUrl.searchParams.get('createEnvironment')) ||
    (!currentUrl.searchParams.get('deleteEnvironment') &&
      nextUrl.searchParams.get('deleteEnvironment')) ||
    (!currentUrl.searchParams.get('createAccount') &&
      nextUrl.searchParams.get('createAccount'))
  ) {
    return false;
  }
  return defaultShouldRevalidate;
};

export default function Component() {
  const environmentId = useEnvironmentParam();
  const accountId = useAccountParam();
  invariant(accountId, 'Missing accountId param');
  invariant(environmentId, 'Missing environmentId param');

  return (
    <CloudAdminBaseURLProvider
      environmentId={environmentId}
      accountId={accountId}
    >
      <Outlet />
    </CloudAdminBaseURLProvider>
  );
}
