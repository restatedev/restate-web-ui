import { UNSTABLE_ToastQueue as ToastQueue } from 'react-aria-components';
import { useSyncExternalStore, type ReactNode } from 'react';

export type IssueSeverity = 'high' | 'low';

export interface IssueContent {
  severity: IssueSeverity;
  label: string;
  details?: ReactNode | Error;
}

export const issueQueue = new ToastQueue<IssueContent>({
  maxVisibleToasts: 100,
});

export function useIssueQueue() {
  const toasts = useSyncExternalStore(
    (cb) => issueQueue.subscribe(cb),
    () => issueQueue.visibleToasts
  );
  return toasts;
}
