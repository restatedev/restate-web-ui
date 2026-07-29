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

const SYS_INVOCATION_STATUS_DEFINITIONS: Record<
  InvocationStatus,
  Omit<InvocationStatusDefinition, 'vqueue'>
> = {
  pending: {
    sysInvocationStatus: 'inboxed',
  },
  scheduled: {
    sysInvocationStatus: 'scheduled',
  },
  'backing-off': {
    sysInvocationStatus: 'invoked',
  },
  ready: {
    sysInvocationStatus: 'invoked',
  },
  yielded: {},
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
    sysInvocationStatus: 'completed',
  },
  failed: {
    sysInvocationStatus: 'completed',
  },
  cancelled: {
    sysInvocationStatus: 'completed',
  },
  killed: {
    sysInvocationStatus: 'completed',
  },
};

export const INVOCATION_STATUSES = Object.keys(
  SYS_INVOCATION_STATUS_DEFINITIONS,
) as InvocationStatus[];

const SHARED_VQUEUE_STATUS_DEFINITIONS = Object.fromEntries(
  SHARED_INVOCATION_STATUS_DEFINITIONS.map(({ key, stage, vqueueStatuses }) => [
    key,
    { stage, statuses: vqueueStatuses },
  ]),
) as Record<InvocationStatus, InvocationStatusDefinition['vqueue']>;

export const INVOCATION_STATUS_DEFINITIONS = Object.fromEntries(
  INVOCATION_STATUSES.map((key) => {
    const { sysInvocationStatus } = SYS_INVOCATION_STATUS_DEFINITIONS[key];
    return [
      key,
      {
        vqueue: SHARED_VQUEUE_STATUS_DEFINITIONS[key],
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
