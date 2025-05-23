import { PropsWithChildren } from 'react';
import type { FeatureFlag } from './type';
import { useIsFeatureFlagEnabled } from './FeatureFlags';

export function FeatureFlag({
  featureFlag,
  children,
}: PropsWithChildren<{ featureFlag: FeatureFlag }>) {
  const isEnabled = useIsFeatureFlagEnabled(featureFlag);
  if (isEnabled) {
    return children;
  }
  return null;
}
