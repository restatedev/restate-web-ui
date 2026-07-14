import {
  INVOCATION_STATUS_DEFINITIONS as SHARED_INVOCATION_STATUS_DEFINITIONS,
  TERMINAL_INVOCATION_STATUSES as SHARED_TERMINAL_INVOCATION_STATUSES,
  type InvocationStatus,
  type InvocationSummaryStage,
} from '@restate/data-access/admin-api-spec';

export type { InvocationStatus };

export type VqueueStage = InvocationSummaryStage;

type InvocationStatusDefinition = {
  vqueue: {
    stage: VqueueStage;
    statuses?: readonly string[];
  };
  sysInvocationStatus?: string;
};

const STORAGE_STATUS_DEFINITIONS: Record<
  InvocationStatus,
  Omit<InvocationStatusDefinition, 'vqueue'> & {
    vqueueStatuses?: readonly string[];
  }
> = {
  pending: {
    vqueueStatuses: ['new'],
    sysInvocationStatus: 'inboxed',
  },
  scheduled: {
    vqueueStatuses: ['scheduled'],
    sysInvocationStatus: 'scheduled',
  },
  'backing-off': {
    vqueueStatuses: ['backing-off'],
    sysInvocationStatus: 'invoked',
  },
  ready: {
    vqueueStatuses: ['started'],
    sysInvocationStatus: 'invoked',
  },
  yielded: { vqueueStatuses: ['yielded'] },
  running: {
    sysInvocationStatus: 'invoked',
  },
  suspended: {
    sysInvocationStatus: 'suspended',
  },
  paused: {
    sysInvocationStatus: 'paused',
  },
  succeeded: {
    vqueueStatuses: ['succeeded'],
    sysInvocationStatus: 'completed',
  },
  failed: {
    vqueueStatuses: ['failed'],
    sysInvocationStatus: 'completed',
  },
  cancelled: {
    vqueueStatuses: ['cancelled'],
    sysInvocationStatus: 'completed',
  },
  killed: {
    vqueueStatuses: ['killed'],
    sysInvocationStatus: 'completed',
  },
};

export const INVOCATION_STATUSES = Object.keys(
  STORAGE_STATUS_DEFINITIONS,
) as InvocationStatus[];

const SHARED_STATUS_STAGES = Object.fromEntries(
  SHARED_INVOCATION_STATUS_DEFINITIONS.map(({ key, stage }) => [key, stage]),
) as Record<InvocationStatus, VqueueStage>;

export const INVOCATION_STATUS_DEFINITIONS = Object.fromEntries(
  INVOCATION_STATUSES.map((key) => {
    const { vqueueStatuses, sysInvocationStatus } =
      STORAGE_STATUS_DEFINITIONS[key];
    return [
      key,
      {
        vqueue: {
          stage: SHARED_STATUS_STAGES[key],
          statuses: vqueueStatuses,
        },
        sysInvocationStatus,
      },
    ];
  }),
) as Record<InvocationStatus, InvocationStatusDefinition>;

export const TERMINAL_INVOCATION_STATUSES = [
  ...SHARED_TERMINAL_INVOCATION_STATUSES,
];

export type TerminalInvocationStatus =
  (typeof TERMINAL_INVOCATION_STATUSES)[number];

export function getInvocationStatusFromVqueue(vqueue?: {
  stage?: string;
  status?: string;
}): InvocationStatus | undefined {
  if (!vqueue?.stage) return undefined;

  return INVOCATION_STATUSES.find((invocationStatus) => {
    const { stage, statuses }: InvocationStatusDefinition['vqueue'] =
      INVOCATION_STATUS_DEFINITIONS[invocationStatus].vqueue;
    return (
      stage === vqueue.stage &&
      (!statuses || statuses.includes(vqueue.status ?? ''))
    );
  });
}
