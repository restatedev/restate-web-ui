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

export function useIssueQueue() {
  return useSyncExternalStore(
    (cb) => issueQueue.subscribe(cb),
    () => issueQueue.visibleToasts,
  );
}
