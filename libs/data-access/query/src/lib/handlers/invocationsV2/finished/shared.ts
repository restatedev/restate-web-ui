import type { components } from '@restate/data-access/admin-api-spec';
import { DEFAULT_SAMPLE_SIZE, MAX_SAMPLE_SIZE } from '../shared';
import {
  TERMINAL_INVOCATION_STATUSES,
  type TerminalInvocationStatus,
} from '../../../invocationStatuses';

export type Outcome = TerminalInvocationStatus;
export type OutcomeRow = { status?: string; count?: number | string };
export type FinishedMode =
  components['schemas']['FinishedInvocationQueryModeV2'];
export type ResolvedFinishedMode =
  | { type: 'exact' }
  | { type: 'sampled'; sampleSize: number };

export const OUTCOMES: Outcome[] = [...TERMINAL_INVOCATION_STATUSES];

export function resolveFinishedMode(mode?: FinishedMode): {
  mode?: ResolvedFinishedMode;
  error?: string;
} {
  if (!mode) {
    return { mode: { type: 'sampled', sampleSize: DEFAULT_SAMPLE_SIZE } };
  }
  if (mode.type === 'exact') return { mode: { type: 'exact' } };
  const sampleSize = mode.sampleSize ?? DEFAULT_SAMPLE_SIZE;
  if (!Number.isInteger(sampleSize) || sampleSize < 1) {
    return { error: 'mode.sampleSize must be a positive integer' };
  }
  if (sampleSize > MAX_SAMPLE_SIZE) {
    return { error: `mode.sampleSize must be at most ${MAX_SAMPLE_SIZE}` };
  }
  return { mode: { type: 'sampled', sampleSize } };
}

export function buildOutcomes(rows: OutcomeRow[]) {
  const counts = new Map<Outcome, number>(
    OUTCOMES.map((status) => [status, 0]),
  );
  for (const row of rows) {
    if (OUTCOMES.includes(row.status as Outcome)) {
      counts.set(row.status as Outcome, Number(row.count ?? 0));
    }
  }
  return OUTCOMES.map((status) => ({ status, count: counts.get(status) ?? 0 }));
}

export function countRows(rows: OutcomeRow[]): number {
  return rows.reduce((sum, row) => sum + Number(row.count ?? 0), 0);
}
