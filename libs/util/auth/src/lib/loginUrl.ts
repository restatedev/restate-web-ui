import type { AppLoadContext } from '@remix-run/cloudflare';

export function getLoginURL({
  RESTATE_AUTH_CLIENT_ID,
  RESTATE_AUTH_URL,
  RESTATE_AUTH_REDIRECT_URL,
  url: _url,
}: Pick<
  AppLoadContext['cloudflare']['env'],
  'RESTATE_AUTH_CLIENT_ID' | 'RESTATE_AUTH_URL' | 'RESTATE_AUTH_REDIRECT_URL'
> & { url: URL }) {
  const url = new URL(_url);
  if (url.pathname === '/logout') {
    url.pathname = '';
    url.search = '';
    url.hash = '';
  }
  return new URL(
    `${RESTATE_AUTH_URL}/login?client_id=${RESTATE_AUTH_CLIENT_ID}&response_type=code&redirect_uri=${RESTATE_AUTH_REDIRECT_URL}&state=${encodeURI(
      url.href
    )
      .split(`${url.protocol}//${url.host}`)
      .at(-1)}`
  ).href;
}
