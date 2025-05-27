import { ClientLoaderFunction, redirect } from 'react-router';
import type { FeatureFlag } from './type';
import { isFeatureEnabled } from './FeatureFlags';

export function withFeatureFlag(
  featureFlag: FeatureFlag,
  loader: ClientLoaderFunction
): ClientLoaderFunction {
  if (isFeatureEnabled(featureFlag)) {
    return loader;
  }

  return () => redirect('/');
}
