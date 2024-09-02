import { LoaderFunction } from '@remix-run/cloudflare';
import { ClientLoaderFunction, redirect } from '@remix-run/react';
import { hasAccessToFeature } from './hasAccessToFeature';
import type { FeatureFlag } from './type';

export function withFeatureFlag(
  featureFlag: FeatureFlag,
  loader: LoaderFunction
): LoaderFunction;
export function withFeatureFlag(
  featureFlag: FeatureFlag,
  loader: ClientLoaderFunction
): ClientLoaderFunction;
export function withFeatureFlag(
  featureFlag: FeatureFlag,
  loader: LoaderFunction | ClientLoaderFunction
): LoaderFunction | ClientLoaderFunction {
  if (hasAccessToFeature(featureFlag)) {
    return loader;
  }

  return () => redirect('/');
}
