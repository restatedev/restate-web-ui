import { PropsWithChildren } from 'react';
import { hasAccessToFeature } from './hasAccessToFeature';
import type { FeatureFlag } from './type';

export function FeatureFlag({
  featureFlag,
  children,
}: PropsWithChildren<{ featureFlag: FeatureFlag }>) {
  if (hasAccessToFeature(featureFlag)) {
    return children;
  }
  return null;
}
