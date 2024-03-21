// TODO: Ideally should be removed and replaced by a cookie
export function getAccessToken() {
  if (typeof window !== 'undefined') {
    return new URLSearchParams(window.location.search).get('access_token');
  }

  return null;
}
