import { UNSTABLE_ToastQueue as ToastQueue } from 'react-aria-components';
import { useSyncExternalStore, type ReactNode } from 'react';
import type { IssueSeverity } from './service-issues';

export interface IssueContent {
  severity: IssueSeverity;
  label: string;
  details?: ReactNode | Error;
}

export const issueQueue = new ToastQueue<IssueContent>({
  maxVisibleToasts: 100,
});

const EMPTY_VISIBLE_TOASTS: typeof issueQueue.visibleToasts = [];

export function useIssueQueue() {
  return useSyncExternalStore(
    (cb) => issueQueue.subscribe(cb),
    () => issueQueue.visibleToasts,
    // Toasts are queued client-side only; the server has none, so the SSR
    // snapshot is a stable empty list (matches the fresh client value).
    () => EMPTY_VISIBLE_TOASTS,
  );
}
