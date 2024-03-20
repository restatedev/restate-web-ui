// TODO: Ideally should be removed and replaced by a cookie
export function getAccessToken() {
  if (typeof window !== 'undefined') {
    return new URLSearchParams(window.location.search).get('access_token');
  }

  return null;
}

// TODO: should be env based
export function getBaseUrl() {
  return 'https://api.dev.restate.cloud';
}
