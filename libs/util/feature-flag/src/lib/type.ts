export const FEATURE_FLAGS = [
  'FEATURE_STATE_STORAGE_BREAKDOWN',

  'FEATURE_OPERATOR_QUERY_LEVEL',

  'FEATURE_INDEXES_V1',
] as const;
export type FeatureFlag = (typeof FEATURE_FLAGS)[number];
