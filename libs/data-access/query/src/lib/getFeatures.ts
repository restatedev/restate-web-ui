import { getUiFeatures, withUiFeatures } from './uiFeatures.js';

export const RESTATE_FEATURES_HEADER = 'x-restate-features';

export function getFeatures(headers: Headers): Set<string> {
  const raw = headers.get(RESTATE_FEATURES_HEADER);
  return withUiFeatures(
    new Set(raw ? raw.split(',').filter(Boolean) : []),
    getUiFeatures(headers),
  );
}
