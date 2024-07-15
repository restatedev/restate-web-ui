import { getAuthRedirectUri } from './authRedirectUri';

export function getLoginUrl(url: URL) {
  url = new URL(
    `${process.env['RESTATE_AUTH_URL']}/login?client_id=${
      process.env['RESTATE_AUTH_CLIENT_ID']
    }&response_type=code&redirect_uri=${getAuthRedirectUri(url).href}`
  );
  return url;
}
