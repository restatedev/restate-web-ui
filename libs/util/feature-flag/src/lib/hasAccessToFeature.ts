export function hasAccessToFeature(featureFlag: string) {
  return globalThis.env[featureFlag] === 'true';
}
