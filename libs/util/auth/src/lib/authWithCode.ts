import { setAccessToken } from './accessToken';
import { getAuthRedirectUri } from './authRedirectUri';
import { CODE_PARAM_NAME } from './constants';
import { getLoginUrl } from './loginUrl';

import { getRedirectUrl, removeRedirectUrl } from './redirectUrl';

export async function authWithCode(url: URL) {
  try {
    const searchParams = url.searchParams;
    const response = await fetch(
      `${process.env['RESTATE_AUTH_URL']}/oauth2/token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: String(process.env['RESTATE_AUTH_CLIENT_ID']),
          code: String(searchParams.get(CODE_PARAM_NAME)),
          redirect_uri: getAuthRedirectUri(url).href,
        }),
      }
    );
    const { access_token } = (await response.json()) as {
      access_token: string;
    };
    setAccessToken(access_token);
  } catch (error) {
    return getLoginUrl(url).href;
  }
  const redirectUrl = getRedirectUrl();

  if (redirectUrl) {
    removeRedirectUrl();
    return redirectUrl;
  }

  return null;
}
