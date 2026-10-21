import { RestateError } from '@restate/util-errors';

export const TENANT_HEADER = 'x-restate-tenant';
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

export function cronHandlerUrl(muxUrl: string, handler: string) {
  return `${muxUrl.replace(/\/+$/, '')}/restate/call/${CRON_SERVICE}/${CRON_KEY}/${handler}`;
}

async function toError(response: Response) {
  const text = await response.text();
  let message = text;
  let code: string | undefined;
  try {
    const body = JSON.parse(text) as { message?: unknown; code?: unknown };
    if (typeof body.message === 'string') {
      message = body.message;
    }
    if (body.code !== undefined && body.code !== null) {
      code = String(body.code);
    }
  } catch {
    message = text;
  }
  return new RestateError(
    message || `The ingress mux answered ${response.status}`,
    code,
    undefined,
    undefined,
    response.status,
  );
}

export async function callCron<T>({
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
  const response = await fetch(cronHandlerUrl(muxUrl, handler), {
    method: 'POST',
    signal,
    headers: {
      accept: 'application/json',
      [TENANT_HEADER]: scope,
      ...(body !== undefined && { 'content-type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    throw await toError(response);
  }
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}
