import { muxPost } from '@restate/data-access-ingress-mux';
export const CRON_SERVICE = 'cron';
export const CRON_KEY = 'default';

export interface CronTarget {
  service: string;
  handler: string;
}

export interface CronRun {
  runId: string;
  invocationId: string;
  at: number;
}

export interface CronSchedule {
  id: string;
  target: CronTarget;
  payload?: unknown;
  cron: {
    expression: string;
    normalized: string;
    timezone: string;
  };
  createdAt: number;
  updatedAt?: number;
  nextRunAt: number;
  lastRuns: CronRun[];
}

export interface CronProject {
  timer: { invocationId: string; wakeUpAt: number } | null;
  schedules: CronSchedule[];
}

export interface CreateScheduleRequest {
  cron: string;
  timezone: string;
  target: CronTarget;
  payload?: unknown;
}

export interface UpdateScheduleRequest extends CreateScheduleRequest {
  id: string;
}

export function callCron<T>({
  muxUrl,
  scope,
  handler,
  body,
  signal,
}: {
  muxUrl: string;
  scope: string;
  handler: 'list' | 'create' | 'update' | 'delete';
  body?: unknown;
  signal?: AbortSignal;
}): Promise<T> {
  return muxPost<T>({
    muxUrl,
    scope,
    path: `/restate/call/${CRON_SERVICE}/${CRON_KEY}/${handler}`,
    body,
    signal,
  });
}
