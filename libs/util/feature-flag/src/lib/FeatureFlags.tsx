import {
  createContext,
  PropsWithChildren,
  use,
  useSyncExternalStore,
} from 'react';
import { FEATURE_FLAGS, type FeatureFlag } from './type';

const FEATURE_FLAG_CHANGE_EVENT = 'restate-feature-flag-change';
const EMPTY_FEATURE_FLAGS: Partial<Record<FeatureFlag, boolean>> = {};

const FeatureFlagsContext = createContext<{
  featureFlags: Partial<Record<FeatureFlag, boolean>>;
  setFeatureFlag?: (flag: FeatureFlag, value: boolean) => void;
}>({ featureFlags: {} });

export function isFeatureEnabled(flag: FeatureFlag) {
  return (
    typeof localStorage !== 'undefined' && localStorage.getItem(flag) === 'true'
  );
}

export function setFeatureFlag(flag: FeatureFlag, value: boolean) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(flag, String(value));
  refreshFeatureFlags();
  window.dispatchEvent(new Event(FEATURE_FLAG_CHANGE_EVENT));
}

let value: Partial<Record<FeatureFlag, boolean>> = EMPTY_FEATURE_FLAGS;

function readFeatureFlags() {
  if (typeof localStorage === 'undefined') return EMPTY_FEATURE_FLAGS;
  return FEATURE_FLAGS.reduce(
    (result, flag) => ({
      ...result,
      [flag]: isFeatureEnabled(flag),
    }),
    {} as Record<FeatureFlag, boolean>,
  );
}

function refreshFeatureFlags() {
  value = readFeatureFlags();
}

function getFeatureFlags() {
  return value;
}

function getServerFeatureFlags() {
  return EMPTY_FEATURE_FLAGS;
}

function isFeatureFlag(key: string | null): key is FeatureFlag {
  return Boolean(key && ([...FEATURE_FLAGS] as string[]).includes(key));
}

function onFlagChange(callback: VoidFunction) {
  let active = true;
  const update = () => {
    refreshFeatureFlags();
    callback();
  };
  function storageEventHandler(event: StorageEvent) {
    if (isFeatureFlag(event.key)) {
      update();
    }
  }

  queueMicrotask(() => {
    if (active) update();
  });
  window.addEventListener('storage', storageEventHandler);
  window.addEventListener(FEATURE_FLAG_CHANGE_EVENT, update);
  return () => {
    active = false;
    window.removeEventListener('storage', storageEventHandler);
    window.removeEventListener(FEATURE_FLAG_CHANGE_EVENT, update);
  };
}

export function FeatureFlags({ children }: PropsWithChildren) {
  const featureFlags = useSyncExternalStore(
    onFlagChange,
    getFeatureFlags,
    getServerFeatureFlags,
  );

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
