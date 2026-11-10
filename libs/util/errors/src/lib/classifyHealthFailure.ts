import { RestateError } from './RestateError.js';
import { isUnauthorizedError } from './UnauthorizedError.js';

export type HealthFailure =
  | {
      kind: 'server-error';
      status: number;
      message: string;
      restateCode?: string;
    }
  | { kind: 'unauthorized' }
  | { kind: 'unreachable'; offline: boolean };

export function classifyHealthFailure(error: unknown): HealthFailure {
  if (error instanceof Error && isUnauthorizedError(error)) {
    return { kind: 'unauthorized' };
  }
  if (error instanceof RestateError && typeof error.status === 'number') {
    return {
      kind: 'server-error',
      status: error.status,
      message: error.message,
      ...(error.restateCode && { restateCode: error.restateCode }),
    };
  }
  return {
    kind: 'unreachable',
    offline: typeof navigator !== 'undefined' && navigator.onLine === false,
  };
}

export function getHealthFailureMessage(failure: HealthFailure): string {
  switch (failure.kind) {
    case 'server-error':
      return 'Your Restate server is currently experiencing issues.';
    case 'unauthorized':
      return 'Authentication with your Restate server failed.';
    case 'unreachable':
      return failure.offline
        ? 'You appear to be offline. Reconnect to access your Restate server.'
        : 'Cannot reach your Restate server. This could be a network issue. Check your connection or browser.';
  }
}

export function healthFailureToError(failure: HealthFailure): Error {
  if (failure.kind === 'server-error') {
    return new RestateError(
      failure.message,
      failure.restateCode,
      undefined,
      undefined,
      failure.status,
    );
  }
  return new Error(getHealthFailureMessage(failure));
}
