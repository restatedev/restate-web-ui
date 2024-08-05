/**
 * TODO: Storing the access token in local storage is not secure.
 * Currently, we save the token there to enable users to authenticate across multiple sessions.
 */

import { getLoginURL } from './loginUrl';
import { json, redirect, type LoaderFunctionArgs } from '@remix-run/cloudflare';
import { clearAuthCookie, getAuthCookie } from './authCookie';

const ACCESS_TOKEN_KEY = 'atk';

// TODO: remove this file

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(token: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function logOut({
  persistRedirectUrl,
}: {
  persistRedirectUrl?: boolean;
} = {}) {
  if (typeof window !== 'undefined') {
    const returnUrl = persistRedirectUrl
      ? `${window.location.pathname}${window.location.search}${window.location.hash}`
      : '/';
    const searchParams = new URLSearchParams({ returnUrl });
    window.location.assign(`/logout?${searchParams}`);
  }
}

export async function accessTokenLoader(args: LoaderFunctionArgs) {
  const accessToken = await getAuthCookie(args.request);
  if (!accessToken) {
    return json({}, { status: 401 });
  }
  return json({ accessToken });
}

export async function logoutLoader(args: LoaderFunctionArgs) {
  const url = new URL(args.request.url);

  return redirect(
    getLoginURL({
      returnUrl: url.searchParams.get('returnUrl'),
    }),
    {
      headers: await clearAuthCookie(url.protocol === 'https:'),
    }
  );
}
