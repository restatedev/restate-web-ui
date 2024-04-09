/**
 * TODO: Storing the access token in local storage is not secure.
 * Currently, we save the token there to enable users to authenticate across multiple sessions.
 */

const ACCESS_TOKEN_KEY = 'atk';
const LOGIN_URL = 'https://restate.dev';

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(token: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function logOut() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.location.assign(LOGIN_URL);
}
