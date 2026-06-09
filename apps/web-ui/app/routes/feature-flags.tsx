import { type ClientLoaderFunction, redirect } from 'react-router';
import {
  FEATURE_FLAGS,
  setFeatureFlag,
  type FeatureFlag,
} from '@restate/util/feature-flag';

function isKnownFlag(flag?: string): flag is FeatureFlag {
  return Boolean(flag && (FEATURE_FLAGS as readonly string[]).includes(flag));
}

// Local-only, temporary feature-flag switch. Visiting /feature-flags/<FLAG>
// persists it to localStorage and redirects home; add ?enabled=false to turn
// it off. There is no settings UI — flags are flipped via this URL.
export const clientLoader: ClientLoaderFunction = ({ params, request }) => {
  const { flag } = params;
  if (isKnownFlag(flag)) {
    const enabled =
      new URL(request.url).searchParams.get('enabled') !== 'false';
    setFeatureFlag(flag, enabled);
  }
  return redirect('/');
};

export default () => null;
