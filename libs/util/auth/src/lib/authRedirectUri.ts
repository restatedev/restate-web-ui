export function getAuthRedirectUri(url: URL) {
  url.pathname = '/auth';
  url.search = '';
  url.hash = '';

  return url;
}
