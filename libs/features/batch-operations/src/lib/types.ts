import type { FilterItem } from '@restate/data-access/admin-api/spec';
import { ProgressStore } from './ProgressStore';
import { QueryClauseSchema, QueryClauseType } from '@restate/ui/query-builder';

export type OperationType = 'cancel' | 'pause' | 'resume' | 'kill' | 'purge';

export interface ProgressState {
  successful: number;
  failed: number;
  total: number;
  failedInvocationIds: { invocationId: string; error: string }[];
  isFinished: boolean;
  isError: boolean;
}

export type BatchState = {
  id: string;
  isDialogOpen: boolean;
  progressStore: ProgressStore<ProgressState>;
} & (
  | {
      type: Exclude<OperationType, 'resume'>;
      params:
        | { invocationIds: string[] }
        | {
            filters: (FilterItem & { isActionImplicitFilter?: boolean })[];
            schema?: QueryClauseSchema<QueryClauseType>[];
          };
    }
  | {
      type: 'resume';
      params:
        | { invocationIds: string[]; deployment?: 'Latest' | 'Keep' }
        | {
            filters: (FilterItem & { isActionImplicitFilter?: boolean })[];
            deployment?: 'Latest' | 'Keep';
            schema?: QueryClauseSchema<QueryClauseType>[];
          };
    }
);
