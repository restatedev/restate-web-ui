import {
  createContext,
  PropsWithChildren,
  use,
  useSyncExternalStore,
} from 'react';
import { FEATURE_FLAGS, type FeatureFlag } from './type';

const FeatureFlagsContext = createContext<{
  featureFlags: Partial<Record<FeatureFlag, boolean>>;
  setFeatureFlag?: (flag: FeatureFlag, value: boolean) => void;
}>({ featureFlags: {} });

export function isFeatureEnabled(flag: FeatureFlag) {
  return localStorage.getItem(flag) === 'true';
}

function setFeatureFlag(flag: FeatureFlag, value: boolean) {
  return localStorage.setItem(flag, String(value));
}

let value: Partial<Record<FeatureFlag, boolean>> = {};

function getFeatureFlags() {
  return value;
}

function isFeatureFlag(key: string | null): key is FeatureFlag {
  return Boolean(key && ([...FEATURE_FLAGS] as string[]).includes(key));
}

function onFlagChange(callback: VoidFunction) {
  function storageEventHandler(event: StorageEvent) {
    if (isFeatureFlag(event.key)) {
      value = FEATURE_FLAGS.reduce(
        (result, flag) => ({
          ...result,
          [flag]: isFeatureEnabled(flag),
        }),
        {} as Record<FeatureFlag, boolean>,
      );
      callback();
    }
  }

  window.addEventListener('storage', storageEventHandler);
  return () => {
    window.removeEventListener('storage', storageEventHandler);
  };
}

export function FeatureFlags({ children }: PropsWithChildren) {
  const featureFlags = useSyncExternalStore(onFlagChange, getFeatureFlags);

  return (
    <FeatureFlagsContext.Provider value={{ featureFlags, setFeatureFlag }}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

export function useIsFeatureFlagEnabled(flag: FeatureFlag) {
  const { featureFlags } = use(FeatureFlagsContext);

  return Boolean(featureFlags[flag]);
}
