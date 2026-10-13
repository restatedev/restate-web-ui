import type { VqueueStage } from '../../invocationStatuses';
import { defineIndexTable } from './shared';

export type EntryKind = 'invocation' | 'state-mutation';

type StageCounts = {
  num_inbox: number;
  num_running: number;
  num_suspended: number;
  num_paused: number;
  num_finished: number;
};

export type EntryByStageRow = {
  stage: VqueueStage;
  transitioned_at: string;
  entry_id: string;
};

export type EntryByServiceRow = EntryByStageRow & {
  service_name: string;
};

export type EntryByVirtualObjectRow = EntryByServiceRow & {
  scope: string | null;
  key: string;
};

export type EntryNextAtByStageRow = {
  stage: VqueueStage;
  next_at: string;
  seq: number;
  entry_id: string;
};

export type EntryNextAtByServiceRow = EntryNextAtByStageRow & {
  service_name: string;
};

export type EntryNextAtByVirtualObjectRow = EntryNextAtByServiceRow & {
  scope: string | null;
  key: string;
};

export type BusyVqueueRow = StageCounts & {
  total_non_completed: number;
  last_modified: string;
  scope: string | null;
  vqueue_id: string;
};

export type ServiceStatsRow = {
  service_name: string;
  handler: string | null;
  kind: EntryKind;
  stage: VqueueStage;
  status: string;
  num_entries: number;
};

export type DeploymentStatsRow = {
  deployment_id: string;
  service_name: string;
  stage: VqueueStage;
  status: string;
  num_entries: number;
};

export type VirtualObjectStatsRow = {
  service_name: string;
  scope: string | null;
  key: string;
  handler: string | null;
  kind: EntryKind;
  stage: VqueueStage;
  status: string;
  num_entries: number;
};

const TRANSITIONED_AT_DESC = 'transitioned_at DESC';
const NEXT_AT_ASC = 'next_at ASC, seq ASC';

export const ENTRY_BY_STAGE = defineIndexTable<EntryByStageRow>()({
  name: '_idx_entry_by_stage',
  keys: ['stage'],
  filters: { status: 'stage', stage: 'stage' },
  sorts: { transitioned_at: 'transitioned_at' },
  order: TRANSITIONED_AT_DESC,
  columns: ['stage', 'transitioned_at', 'entry_id'],
});

export const ENTRY_BY_SERVICE = defineIndexTable<EntryByServiceRow>()({
  name: '_idx_entry_by_service',
  keys: ['stage', 'service_name'],
  filters: {
    status: 'stage',
    stage: 'stage',
    target_service_name: 'service_name',
  },
  sorts: { transitioned_at: 'transitioned_at' },
  order: TRANSITIONED_AT_DESC,
  columns: ['stage', 'service_name', 'transitioned_at', 'entry_id'],
});

export const ENTRY_BY_VIRTUAL_OBJECT =
  defineIndexTable<EntryByVirtualObjectRow>()({
    name: '_idx_entry_by_virtual_object',
    keys: ['service_name', 'scope', 'key', 'stage'],
    filters: {
      status: 'stage',
      stage: 'stage',
      target_service_name: 'service_name',
      scope: 'scope',
      target_service_key: 'key',
    },
    sorts: { transitioned_at: 'transitioned_at' },
    order: TRANSITIONED_AT_DESC,
    columns: [
      'service_name',
      'scope',
      'key',
      'stage',
      'transitioned_at',
      'entry_id',
    ],
  });

export const ENTRY_NEXT_AT_BY_STAGE = defineIndexTable<EntryNextAtByStageRow>()(
  {
    name: '_idx_entry_next_at_by_stage',
    keys: ['stage'],
    order: NEXT_AT_ASC,
    columns: ['stage', 'next_at', 'seq', 'entry_id'],
  },
);

export const ENTRY_NEXT_AT_BY_SERVICE =
  defineIndexTable<EntryNextAtByServiceRow>()({
    name: '_idx_entry_next_at_by_service',
    keys: ['stage', 'service_name'],
    order: NEXT_AT_ASC,
    columns: ['stage', 'service_name', 'next_at', 'seq', 'entry_id'],
  });

export const ENTRY_NEXT_AT_BY_VIRTUAL_OBJECT =
  defineIndexTable<EntryNextAtByVirtualObjectRow>()({
    name: '_idx_entry_next_at_by_virtual_object',
    keys: ['service_name', 'scope', 'key', 'stage'],
    order: NEXT_AT_ASC,
    columns: [
      'service_name',
      'scope',
      'key',
      'stage',
      'next_at',
      'seq',
      'entry_id',
    ],
  });

export const BUSY_VQUEUE = defineIndexTable<BusyVqueueRow>()({
  name: '_idx_busy_vqueue',
  keys: ['total_non_completed', 'last_modified', 'scope', 'vqueue_id'],
  order: 'total_non_completed DESC, last_modified DESC',
  columns: [
    'total_non_completed',
    'last_modified',
    'scope',
    'vqueue_id',
    'num_inbox',
    'num_running',
    'num_suspended',
    'num_paused',
    'num_finished',
  ],
});

export const SERVICE_STATS = defineIndexTable<ServiceStatsRow>()({
  name: 'sys_service_stats',
  keys: ['service_name', 'handler', 'kind'],
  columns: [
    'service_name',
    'handler',
    'kind',
    'stage',
    'status',
    'num_entries',
  ],
});

export const DEPLOYMENT_STATS = defineIndexTable<DeploymentStatsRow>()({
  name: 'sys_deployment_stats',
  keys: ['deployment_id', 'service_name'],
  columns: ['deployment_id', 'service_name', 'stage', 'status', 'num_entries'],
});

export const VIRTUAL_OBJECT_STATS = defineIndexTable<VirtualObjectStatsRow>()({
  name: 'sys_virtual_object_stats',
  keys: ['service_name', 'scope', 'key', 'handler', 'kind'],
  columns: [
    'service_name',
    'scope',
    'key',
    'handler',
    'kind',
    'stage',
    'status',
    'num_entries',
  ],
});
