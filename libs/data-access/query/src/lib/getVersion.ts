export const RESTATE_VERSION_HEADER = 'x-restate-version';

export function getVersion(headers: Headers) {
  const version = headers.get(RESTATE_VERSION_HEADER) || '9999999.0.0';
  return version;
}
