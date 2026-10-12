export const RESTATE_FEATURES_HEADER = 'x-restate-features';

export function getFeatures(headers: Headers): Set<string> {
  const raw = headers.get(RESTATE_FEATURES_HEADER);
  return new Set(raw ? raw.split(',').filter(Boolean) : []);
}
