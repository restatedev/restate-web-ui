/**
 * TODO: Storing the access token in local storage is not secure.
 * Currently, we save the token there to enable users to authenticate across multiple sessions.
 */

import { LOGIN_URL } from './loginUrl';
import { setRedirectUrl } from './redirectUrl';

const ACCESS_TOKEN_KEY = 'atk';

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
  if (persistRedirectUrl) {
    setRedirectUrl();
  }
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.location.assign(LOGIN_URL);
}
