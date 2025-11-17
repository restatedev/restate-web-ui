import type { FilterItem } from '@restate/data-access/admin-api/spec';
import { ProgressStore } from './ProgressStore';

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
      params: { invocationIds: string[] } | { filters: FilterItem[] };
    }
  | {
      type: 'resume';
      params:
        | { invocationIds: string[]; deployment?: 'Latest' | 'Keep' }
        | { filters: FilterItem[]; deployment?: 'Latest' | 'Keep' };
    }
);
