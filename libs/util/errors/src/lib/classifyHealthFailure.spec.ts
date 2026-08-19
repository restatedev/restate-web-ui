import { afterEach, describe, expect, it, vi } from 'vitest';
import { classifyHealthFailure } from './classifyHealthFailure';
import { RestateError } from './RestateError';
import { UnauthorizedError } from './UnauthorizedError';

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
