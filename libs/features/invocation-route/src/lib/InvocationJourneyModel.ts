import type {
  JournalEntryV2,
  VqueueSnapshot,
} from '@restate/data-access/admin-api-spec';
import type { Entry, Status } from '@restate/features/invocation-ui';
import type { ComponentProps } from 'react';

export type JourneyActivityKind =
  | 'errorBackoffs'
  | 'yields'
  | 'pauses'
  | 'suspensions';

export type JourneyCurrentStatus =
  | 'pending'
  | 'scheduled'
  | 'yielded'
  | 'running'
  | 'suspended'
  | 'backing-off'
  | 'paused';

export type JourneyTerminalStatus =
  | 'succeeded'
  | 'failed'
  | 'cancelled'
  | 'killed';

export type JourneyActivityCounts = Record<JourneyActivityKind, number>;

export type JourneyActivityDetail = {
  key: string;
  entry: JournalEntryV2;
  parentCommand?: JournalEntryV2;
};

export type JourneyJournalInvocation = NonNullable<
  ComponentProps<typeof Entry>['invocation']
>;

export type JourneyStatusInvocation = ComponentProps<
  typeof Status
>['invocation'];

export type JourneyActivityDetailGroup = {
  summary?: string;
  items: JourneyActivityDetail[];
  totalItems: number;
  itemNoun?: string;
  emptyMessage?: string;
  invocation?: JourneyJournalInvocation;
};

export type JourneyAverageRatio = number | string;

export type JourneyNodeTiming = {
  value: string;
  date?: string;
  tooltipTitle?: string;
};

export type JourneyPendingAttempt = {
  reason: string;
  resource?: VqueueSnapshot['status']['blockedResource'];
  blockedDuration?: string;
  duration?: string;
  ratio?: JourneyAverageRatio;
};

export type JourneyComparison = {
  elapsed: string;
  ratio?: JourneyAverageRatio;
  isFinished: boolean;
};

export type JourneyQueueWait = {
  duration: string;
  ratio?: JourneyAverageRatio;
};

export type JourneyBlockedTime = {
  duration: string;
  average?: string;
  ratio?: JourneyAverageRatio;
  breakdown: Array<{
    gate: string;
    label: string;
    duration: string;
    average?: string;
    ratio?: JourneyAverageRatio;
  }>;
};

export type JourneyInboxContext = {
  position?: number;
  total: number;
  waiting: string;
  ratio?: JourneyAverageRatio;
};

export type InvocationJourneyModel = {
  key: string;
  createdTiming: JourneyNodeTiming;
  firstRunnableAfter?: string;
  runnableIn?: string;
  attempts: number;
  retryAttempts?: number;
  attemptsDuration?: string;
  firstAttemptTiming?: JourneyNodeTiming;
  latestAttemptTiming?: JourneyNodeTiming;
  activity: JourneyActivityCounts;
  activityDetails?: Partial<
    Record<JourneyActivityKind, JourneyActivityDetailGroup>
  >;
  firstQueueWait?: JourneyQueueWait;
  blockedTime?: JourneyBlockedTime;
  latestAttemptBlockedTime?: JourneyBlockedTime;
  currentStatus?: JourneyCurrentStatus;
  currentStatusInvocation?: JourneyStatusInvocation;
  currentAttemptActive?: boolean;
  currentStatusDuration?: string;
  terminal?: {
    status: JourneyTerminalStatus;
    timing?: JourneyNodeTiming;
  };
  purge?: {
    timing: string;
  };
  pendingAttempt?: JourneyPendingAttempt;
  inboxState?: 'pending' | 'queued';
  comparison: JourneyComparison;
  inbox?: JourneyInboxContext;
  inboxSnapshot?: VqueueSnapshot;
};
