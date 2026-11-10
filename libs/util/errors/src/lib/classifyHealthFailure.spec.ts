import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  classifyHealthFailure,
  getHealthFailureMessage,
  healthFailureToError,
} from './classifyHealthFailure.js';
import { RestateError } from './RestateError.js';
import { UnauthorizedError } from './UnauthorizedError.js';

describe('classifyHealthFailure', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('classifies an UnauthorizedError as unauthorized', () => {
    expect(classifyHealthFailure(new UnauthorizedError())).toEqual({
      kind: 'unauthorized',
    });
  });

  it('classifies a RestateError with a status as a server error', () => {
    const error = new RestateError(
      'Service unavailable',
      'RT0001',
      undefined,
      undefined,
      503,
    );
    expect(classifyHealthFailure(error)).toEqual({
      kind: 'server-error',
      status: 503,
      message: 'Service unavailable',
      restateCode: 'RT0001',
    });
  });

  it('omits an empty restate code on server errors', () => {
    const error = new RestateError(
      'Bad gateway',
      '',
      undefined,
      undefined,
      502,
    );
    expect(classifyHealthFailure(error)).toEqual({
      kind: 'server-error',
      status: 502,
      message: 'Bad gateway',
    });
  });

  it('classifies a fetch TypeError as unreachable', () => {
    vi.stubGlobal('navigator', { onLine: true });
    expect(classifyHealthFailure(new TypeError('Failed to fetch'))).toEqual({
      kind: 'unreachable',
      offline: false,
    });
  });

  it('classifies a RestateError without a status as unreachable', () => {
    vi.stubGlobal('navigator', { onLine: true });
    expect(classifyHealthFailure(new RestateError('boom'))).toEqual({
      kind: 'unreachable',
      offline: false,
    });
  });

  it('reports offline when the browser is offline', () => {
    vi.stubGlobal('navigator', { onLine: false });
    expect(classifyHealthFailure(new TypeError('Failed to fetch'))).toEqual({
      kind: 'unreachable',
      offline: true,
    });
  });
});

describe('healthFailureToError', () => {
  it('keeps the status, message and code of a server error', () => {
    const error = healthFailureToError({
      kind: 'server-error',
      status: 400,
      message: 'Malformed environment id',
      restateCode: 'RT0001',
    });
    expect(error).toBeInstanceOf(RestateError);
    expect(error).toMatchObject({
      message: 'Malformed environment id',
      status: 400,
      restateCode: 'RT0001',
    });
  });

  it.each([
    [
      { kind: 'unauthorized' } as const,
      'Authentication with your Restate server failed.',
    ],
    [
      { kind: 'unreachable', offline: false } as const,
      'Cannot reach your Restate server. This could be a network issue. Check your connection or browser.',
    ],
    [
      { kind: 'unreachable', offline: true } as const,
      'You appear to be offline. Reconnect to access your Restate server.',
    ],
  ])('words %o like the health notification', (failure, message) => {
    expect(healthFailureToError(failure).message).toBe(message);
    expect(getHealthFailureMessage(failure)).toBe(message);
  });
});
