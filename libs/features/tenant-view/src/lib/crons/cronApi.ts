import { RestateError, UnauthorizedError } from '@restate/util-errors';
import { useSyncExternalStore } from 'react';

export const MUX_TOKEN_STORAGE_KEY = 'restate-mux-token';
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

export interface MuxTokenState {
  token?: string;
  isRejected: boolean;
}

const SERVER_TOKEN_STATE: MuxTokenState = { isRejected: false };
const listeners = new Set<() => void>();
let tokenState: MuxTokenState | undefined;

function readStoredToken() {
  try {
    return localStorage.getItem(MUX_TOKEN_STORAGE_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

function getTokenState() {
  tokenState ??= { token: readStoredToken(), isRejected: false };
  return tokenState;
}

function writeStoredToken(token: string | undefined) {
  try {
    if (token) {
      localStorage.setItem(MUX_TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(MUX_TOKEN_STORAGE_KEY);
    }
    return true;
  } catch {
    return false;
  }
}

export function setMuxToken(token: string | undefined, isRejected = false) {
  writeStoredToken(token);
  tokenState = { token, isRejected };
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useMuxToken() {
  return useSyncExternalStore(
    subscribe,
    getTokenState,
    () => SERVER_TOKEN_STATE,
  );
}

export function cronHandlerUrl(muxUrl: string, scope: string, handler: string) {
  return `${muxUrl.replace(/\/+$/, '')}/restate/scope/${encodeURIComponent(scope)}/call/${CRON_SERVICE}/${CRON_KEY}/${handler}`;
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
  handler: 'list' | 'create' | 'delete';
  body?: unknown;
  signal?: AbortSignal;
}): Promise<T> {
  const { token } = getTokenState();
  if (!token) {
    throw new UnauthorizedError();
  }
  const response = await fetch(cronHandlerUrl(muxUrl, scope, handler), {
    method: 'POST',
    signal,
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${token}`,
      ...(body !== undefined && { 'content-type': 'application/json' }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (response.status === 401) {
    setMuxToken(undefined, true);
    throw new UnauthorizedError();
  }
  if (!response.ok) {
    throw await toError(response);
  }
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}
