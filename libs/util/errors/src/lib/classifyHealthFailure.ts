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
