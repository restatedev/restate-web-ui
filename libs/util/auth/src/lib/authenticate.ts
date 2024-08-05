import type { LoaderFunctionArgs } from '@remix-run/cloudflare';
import { redirect } from '@remix-run/cloudflare';
import { CODE_PARAM_NAME } from './constants';
import { setAuthCookie } from './authCookie';
import { getLoginURL } from './loginUrl';

export async function authenticate(args: LoaderFunctionArgs) {
  const url = new URL(args.request.url);
  const {
    RESTATE_AUTH_CLIENT_ID,
    RESTATE_AUTH_URL,
    RESTATE_AUTH_REDIRECT_URL,
  } = args.context.cloudflare.env;
  const searchParams = url.searchParams;

  try {
    const response = await fetch(`${RESTATE_AUTH_URL}/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: RESTATE_AUTH_CLIENT_ID,
        code: String(searchParams.get(CODE_PARAM_NAME)),
        redirect_uri: RESTATE_AUTH_REDIRECT_URL,
      }),
    });
    const {
      access_token,
    }: {
      access_token: string;
    } = await response.json();
    return redirect(decodeURI(searchParams.get('state') ?? '/'), {
      headers: await setAuthCookie(access_token, url.protocol === 'https:'),
    });
  } catch (error) {
    return getLoginURL({
      returnUrl: decodeURI(searchParams.get('state') ?? '/'),
      RESTATE_AUTH_CLIENT_ID,
      RESTATE_AUTH_URL,
      RESTATE_AUTH_REDIRECT_URL,
    });
  }
}
