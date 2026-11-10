import { render } from '@testing-library/react';
import { RestateError } from '@restate/util-errors';
import { vi } from 'vitest';
import { RestateContextProvider, useRestateContext } from './RestateContext';

const health = vi.hoisted(() => ({
  current: {} as {
    isSuccess?: boolean;
    failureCount?: number;
    error?: Error | null;
    failureReason?: Error | null;
    isPaused?: boolean;
  },
}));

vi.mock('@restate/data-access-admin-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@restate/data-access-admin-api')>()),
  useHealth: () => health.current,
  useVersion: () => ({ data: undefined }),
  useQueryHealthCheck: () => undefined,
}));

const onContext =
  vi.fn<(value: ReturnType<typeof useRestateContext>) => void>();

function Probe() {
  onContext(useRestateContext());
  return null;
}

function latestContext() {
  return onContext.mock.lastCall?.[0];
}

function failedAttempts(failureCount: number) {
  return {
    isSuccess: false,
    failureCount,
    error: null,
    failureReason: new RestateError(
      'Malformed environment id',
      undefined,
      undefined,
      undefined,
      400,
    ),
  };
}

function renderProvider() {
  const tree = () => (
    <RestateContextProvider>
      <Probe />
    </RestateContextProvider>
  );
  const { rerender } = render(tree());
  return () => rerender(tree());
}

describe('RestateContextProvider', () => {
  it('holds back the health error until a retry fails too', () => {
    health.current = failedAttempts(1);
    const rerender = renderProvider();

    expect(latestContext()?.status).toBe('DEGRADED');
    expect(latestContext()?.healthError).toBeUndefined();

    health.current = failedAttempts(2);
    rerender();

    expect(latestContext()?.healthError).toMatchObject({
      message: 'Malformed environment id',
      status: 400,
    });
  });

  it('shows the health error when retries pause after one failure', () => {
    health.current = { ...failedAttempts(1), isPaused: true };
    renderProvider();

    expect(latestContext()?.healthError).toMatchObject({
      message: 'Malformed environment id',
    });
  });

  it('keeps the same health error object across retries', () => {
    health.current = failedAttempts(2);
    const rerender = renderProvider();
    const first = latestContext()?.healthError;

    health.current = failedAttempts(3);
    rerender();

    expect(first).toBeDefined();
    expect(latestContext()?.healthError).toBe(first);
  });

  it('clears the health error once the server answers', () => {
    health.current = failedAttempts(2);
    const rerender = renderProvider();

    health.current = { isSuccess: true, failureCount: 0, error: null };
    rerender();

    expect(latestContext()?.status).toBe('HEALTHY');
    expect(latestContext()?.healthError).toBeUndefined();
  });
});
