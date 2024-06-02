export function getAuthRedirectUri(url: URL) {
  url.pathname = '/auth';
  url.search = '';

  return url;
}
