export function getVersion(headers: Headers) {
  const version = headers.get('x-restate-version') || '9999999.0.0';
  return version;
}
