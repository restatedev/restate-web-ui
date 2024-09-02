import { PropsWithChildren } from 'react';
import { hasAccessToFeature } from './hasAccessToFeature';

export function FeatureFlag({
  featureFlag,
  children,
}: PropsWithChildren<{ featureFlag: string }>) {
  if (hasAccessToFeature(featureFlag)) {
    return children;
  }
  return null;
}
