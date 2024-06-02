import { getAuthRedirectUri } from './authRedirectUri';

export function getLoginUrl(url: URL) {
  const redirectUrl = new URL(window.location.href);
  redirectUrl.pathname = '/auth';
  redirectUrl.search = '';
  url = new URL(
    `${process.env.RESTATE_AUTH_URL}/login?client_id=${
      process.env.RESTATE_AUTH_CLIENT_ID
    }&response_type=code&redirect_uri=${
      getAuthRedirectUri(new URL(window.location.href)).href
    }`
  );

  return url;
}
