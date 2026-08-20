import type {
  InvocationFilterV2,
  InvocationSortV2,
  InvocationStatusV2,
} from '../shared';
import type { VqueueStatus } from '../../../convertInvocation';
import type { VqueueStage } from '../../../invocationStatuses';

export type { VqueueStage } from '../../../invocationStatuses';

export type InvocationCandidateRow = {
  id: string;
  created_at?: string;
  raw_status?: string;
  completion_result?: string;
  completion_failure?: string;
};

export type InvocationCandidate = InvocationCandidateRow & {
  requiresVqueueEntry?: boolean;
  refinesStatusFromVqueue?: boolean;
};

export type InvocationStatusSelection =
  | { type: 'all' }
  | { type: 'selected'; statuses: Set<InvocationStatusV2> };

type CandidateQuery = {
  filters: InvocationFilterV2[];
  statuses: InvocationStatusV2[] | undefined;
  sort: InvocationSortV2 | undefined;
};

export type SysInvocationStatusQueryPlan = CandidateQuery & {
  source: 'sys_invocation_status';
};

export type BestEffortSysInvocationStatusQueryPlan = CandidateQuery & {
  source: 'best_effort_sys_invocation_status';
  statuses: InvocationStatusV2[];
};

export type SysVqueuesQueryPlan = CandidateQuery & {
  source: 'sys_vqueues';
};

export type SysVqueueMetaAndVqueuesQueryPlan = CandidateQuery & {
  source: 'sys_vqueue_meta_and_sys_vqueues';
};

export type InvocationCandidateQueryPlan =
  | SysInvocationStatusQueryPlan
  | BestEffortSysInvocationStatusQueryPlan
  | SysVqueuesQueryPlan
  | SysVqueueMetaAndVqueuesQueryPlan;

type FullInvocationCandidateSourcePlan<
  Query extends InvocationCandidateQueryPlan,
> = Query & {
  coverage: 'full';
};

type PartialInvocationCandidateSourcePlan<
  Query extends InvocationCandidateQueryPlan,
> = Query & {
  coverage: 'partial';
  statuses: InvocationStatusV2[];
};

type InvocationCandidateSourcePlanFor<
  Query extends InvocationCandidateQueryPlan,
> =
  | FullInvocationCandidateSourcePlan<Query>
  | PartialInvocationCandidateSourcePlan<Query>
  | { source: Query['source']; coverage: 'none' };

export type SysInvocationStatusSourcePlan =
  InvocationCandidateSourcePlanFor<SysInvocationStatusQueryPlan>;
export type BestEffortSysInvocationStatusSourcePlan =
  InvocationCandidateSourcePlanFor<BestEffortSysInvocationStatusQueryPlan>;
export type SysVqueuesSourcePlan =
  InvocationCandidateSourcePlanFor<SysVqueuesQueryPlan>;
export type SysVqueueMetaAndVqueuesSourcePlan =
  InvocationCandidateSourcePlanFor<SysVqueueMetaAndVqueuesQueryPlan>;

export type InvocationCandidateSourcePlan =
  | SysInvocationStatusSourcePlan
  | BestEffortSysInvocationStatusSourcePlan
  | SysVqueuesSourcePlan
  | SysVqueueMetaAndVqueuesSourcePlan;

export type ExecutableInvocationCandidateSourcePlan = Exclude<
  InvocationCandidateSourcePlan,
  { coverage: 'none' }
>;

export type VqueueListQueryPlan = {
  statusSelection: InvocationStatusSelection;
  sourcePlans: InvocationCandidateSourcePlan[];
  error?: string;
};

export type VqueueListPartialResult =
  | {
      reason: 'vqueue-limit';
      queueLimit: number;
    }
  | {
      reason: 'candidate-limit';
      candidateLimit: number;
    };

export type VqueueRow = VqueueStatus & {
  entry_id: string;
  vqueue_id?: string;
  stage: VqueueStage;
  status: string;
  created_at?: string;
  transitioned_at?: string;
};
