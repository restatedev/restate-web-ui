import type { ClientLoaderFunctionArgs } from '@remix-run/react';
import { redirect } from '@remix-run/cloudflare';
import { authWithAccessToken } from './authWithAccessToken';
import { authWithCode } from './authWithCode';
import { CODE_PARAM_NAME } from './constants';

export async function authenticate(args: ClientLoaderFunctionArgs) {
  const url = new URL(window.location.href);
  const searchParams = url.searchParams;
  const redirectUrl = searchParams.has(CODE_PARAM_NAME)
    ? await authWithCode(url)
    : authWithAccessToken(url);
  return redirect(redirectUrl ?? '/');
}
