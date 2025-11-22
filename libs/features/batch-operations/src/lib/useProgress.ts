import { useSyncExternalStore } from 'react';
import { ProgressStore } from './ProgressStore';
import { ProgressState } from './types';

export function useProgress(progressStore: ProgressStore<ProgressState>) {
  return useSyncExternalStore(
    progressStore.subscribe,
    progressStore.getSnapshot,
  );
}
