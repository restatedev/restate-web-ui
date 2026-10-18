import type { FeatureFlag } from '@restate/util-feature-flag';
import {
  INDEXES_V1_UI_FEATURE,
  UI_FEATURE_SERVER_FEATURES,
} from '@restate/data-access-query';

const UI_FEATURE_FLAGS = [
  [INDEXES_V1_UI_FEATURE, 'FEATURE_INDEXES_V1'],
] as const satisfies readonly (readonly [
  keyof typeof UI_FEATURE_SERVER_FEATURES,
  FeatureFlag,
])[];

export function getEnabledUiFeatures(
  serverFeatures: ReadonlySet<string>,
  isFlagEnabled: (flag: FeatureFlag) => boolean,
) {
  return UI_FEATURE_FLAGS.flatMap(([feature, flag]) =>
    isFlagEnabled(flag) &&
    serverFeatures.has(UI_FEATURE_SERVER_FEATURES[feature])
      ? [feature]
      : [],
  );
}
