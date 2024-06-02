import { ClientLoaderFunctionArgs, redirect } from '@remix-run/react';
import { authWithAccessToken } from './authWithAccessToken';
import { authWithCode } from './authWithCode';
import { CODE_PARAM_NAME } from './constants';

export async function authenticate(args: ClientLoaderFunctionArgs) {
  const url = new URL(window.location.href);
  const searchParams = url.searchParams;

  if (searchParams.has(CODE_PARAM_NAME)) {
    const redirectUrl = await authWithCode(url);
    return redirectUrl ? redirect(redirectUrl) : null;
  } else {
    const redirectUrl = authWithAccessToken(url);
    return redirectUrl ? redirect(redirectUrl) : null;
  }
}
