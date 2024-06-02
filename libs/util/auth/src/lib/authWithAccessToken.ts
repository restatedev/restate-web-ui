import { getAccessToken, logOut, setAccessToken } from './accessToken';
import { ACCESS_TOKEN_PARAM_NAME } from './constants';
import { getLoginUrl } from './loginUrl';
import { getRedirectUrl, removeRedirectUrl } from './redirectUrl';

export function authWithAccessToken(url: URL) {
  const accessTokenFromURL = url.hash
    .split('#')
    .at(1)
    ?.split('&')
    .find((fragment) => fragment.startsWith(`${ACCESS_TOKEN_PARAM_NAME}=`))
    ?.split('=')
    .at(1);

  if (accessTokenFromURL) {
    setAccessToken(accessTokenFromURL);
  }

  if (!getAccessToken()) {
    logOut({ persistRedirectUrl: true });
    return getLoginUrl(url).href;
  }

  const redirectUrl = getRedirectUrl();
  if (redirectUrl) {
    removeRedirectUrl();
    return redirectUrl;
  }

  return null;
}
