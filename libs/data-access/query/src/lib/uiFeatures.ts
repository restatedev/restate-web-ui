export const UI_FEATURES_HEADER = 'x-restate-ui-features';
export const INDEXES_V1_UI_FEATURE = 'indexes_v1';

export const UI_FEATURE_SERVER_FEATURES = {
  [INDEXES_V1_UI_FEATURE]: 'indexes_v1',
} as const;

type UiFeature = keyof typeof UI_FEATURE_SERVER_FEATURES;

const UI_FEATURE_PREFIX = 'ui:';

export function getUiFeatures(headers: Headers): string[] {
  const raw = headers.get(UI_FEATURES_HEADER);
  return raw ? raw.split(',').filter(Boolean) : [];
}

function usesUiFeature(context: { features: Set<string> }, feature: UiFeature) {
  return (
    context.features.has(UI_FEATURE_SERVER_FEATURES[feature]) &&
    context.features.has(`${UI_FEATURE_PREFIX}${feature}`)
  );
}

export const STATS_SERVER_FEATURE = 'track_status_gauges';

export function usesStatsTables(context: { features: ReadonlySet<string> }) {
  return context.features.has(STATS_SERVER_FEATURE);
}

export function usesIndexesV1(context: { features: Set<string> }) {
  return usesUiFeature(context, INDEXES_V1_UI_FEATURE);
}

export function withUiFeatures(features: Set<string>, uiFeatures: string[]) {
  return new Set([
    ...features,
    ...uiFeatures.map((feature) => `${UI_FEATURE_PREFIX}${feature}`),
  ]);
}
