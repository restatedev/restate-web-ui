export const FEATURE_FLAGS = [
  'FEATURE_OVERVIEW_PAGE',
  'FEATURE_INVOCATIONS_PAGE',
] as const;
export type FeatureFlag = (typeof FEATURE_FLAGS)[number];
