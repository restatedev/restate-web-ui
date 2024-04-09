/**
 * TODO: Storing the access token in local storage is not secure.
 * Currently, we save the token there to enable users to authenticate across multiple sessions.
 */

const ACCESS_TOKEN_KEY = 'atk';

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(token: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function clearAccessToken() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
}
