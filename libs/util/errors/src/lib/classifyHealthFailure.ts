import { RestateError } from './RestateError.js';
import { isUnauthorizedError, UnauthorizedError } from './UnauthorizedError.js';

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

export function healthFailureToError(failure: HealthFailure): Error {
  switch (failure.kind) {
    case 'server-error':
      return new RestateError(
        failure.message,
        failure.restateCode,
        undefined,
        undefined,
        failure.status,
      );
    case 'unauthorized':
      return new UnauthorizedError();
    case 'unreachable':
      return new Error(
        failure.offline
          ? 'You appear to be offline.'
          : 'Cannot reach your Restate server.',
      );
  }
}
