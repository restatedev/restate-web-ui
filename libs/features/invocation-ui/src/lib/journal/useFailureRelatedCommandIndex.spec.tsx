import { renderHook } from '@testing-library/react';
import { useFailureRelatedCommandIndex } from './useFailureRelatedCommandIndex';

const apiHooks = vi.hoisted(() => ({
  useGetPausedError: vi.fn(),
}));

vi.mock('@restate/data-access-admin-api-hooks', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('@restate/data-access-admin-api-hooks')
  >()),
  useGetPausedError: apiHooks.useGetPausedError,
}));

type InvocationArg = Parameters<typeof useFailureRelatedCommandIndex>[0];

let pausedRelatedCommandIndex: number | undefined;
let servePausedErrorWhileDisabled = false;

function invocation(fields: {
  status?: string;
  last_failure_related_command_index?: number;
}) {
  return { id: 'inv-1', ...fields } as InvocationArg;
}

beforeEach(() => {
  pausedRelatedCommandIndex = undefined;
  servePausedErrorWhileDisabled = false;
  apiHooks.useGetPausedError.mockImplementation(
    (_invocationId: string, options?: { enabled?: boolean }) =>
      options?.enabled || servePausedErrorWhileDisabled
        ? {
            data: {
              message: 'boom',
              relatedCommandIndex: pausedRelatedCommandIndex,
            },
          }
        : { data: undefined },
  );
});

it('returns the index the invocation reports, including command 0', () => {
  const { result } = renderHook(() =>
    useFailureRelatedCommandIndex(
      invocation({
        status: 'backing-off',
        last_failure_related_command_index: 0,
      }),
    ),
  );

  expect(result.current.commandIndex).toBe(0);
});

it('falls back to the paused error index while the invocation is paused', () => {
  pausedRelatedCommandIndex = 3;

  const { result } = renderHook(() =>
    useFailureRelatedCommandIndex(invocation({ status: 'paused' })),
  );

  expect(apiHooks.useGetPausedError).toHaveBeenLastCalledWith(
    'inv-1',
    expect.objectContaining({ enabled: true }),
  );
  expect(result.current.commandIndex).toBe(3);
  expect(result.current.pausedError?.message).toBe('boom');
});

it('prefers the invocation index over the paused error index', () => {
  pausedRelatedCommandIndex = 3;

  const { result } = renderHook(() =>
    useFailureRelatedCommandIndex(
      invocation({
        status: 'paused',
        last_failure_related_command_index: 7,
      }),
    ),
  );

  expect(result.current.commandIndex).toBe(7);
});

it('leaves the paused error query disabled unless the invocation is paused', () => {
  const { result } = renderHook(() =>
    useFailureRelatedCommandIndex(invocation({ status: 'backing-off' })),
  );

  expect(apiHooks.useGetPausedError).toHaveBeenLastCalledWith(
    'inv-1',
    expect.objectContaining({ enabled: false }),
  );
  expect(result.current.commandIndex).toBeUndefined();
});

it('leaves the paused error query disabled when the caller disables it', () => {
  pausedRelatedCommandIndex = 3;

  const { result } = renderHook(() =>
    useFailureRelatedCommandIndex(invocation({ status: 'paused' }), {
      enabled: false,
    }),
  );

  expect(apiHooks.useGetPausedError).toHaveBeenLastCalledWith(
    'inv-1',
    expect.objectContaining({ enabled: false }),
  );
  expect(result.current.commandIndex).toBeUndefined();
});

it('ignores a cached paused index once the invocation is resumed', () => {
  pausedRelatedCommandIndex = 3;
  servePausedErrorWhileDisabled = true;

  const { result } = renderHook(() =>
    useFailureRelatedCommandIndex(invocation({ status: 'running' })),
  );

  expect(result.current.commandIndex).toBeUndefined();
  expect(result.current.pausedError).toBeUndefined();
});
