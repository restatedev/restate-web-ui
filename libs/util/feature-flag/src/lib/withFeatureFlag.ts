import { LoaderFunction } from '@remix-run/cloudflare';
import { ClientLoaderFunction, redirect } from '@remix-run/react';
import { hasAccessToFeature } from './hasAccessToFeature';

export function withFeatureFlag(
  featureFlag: string,
  loader: LoaderFunction
): LoaderFunction;
export function withFeatureFlag(
  featureFlag: string,
  loader: ClientLoaderFunction
): ClientLoaderFunction;
export function withFeatureFlag(
  featureFlag: string,
  loader: LoaderFunction | ClientLoaderFunction
): LoaderFunction | ClientLoaderFunction {
  if (hasAccessToFeature(featureFlag)) {
    return loader;
  }

  return () => redirect('/');
}
