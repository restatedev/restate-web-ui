import type {
  InvocationFuture,
  JournalEntryV2,
} from '@restate/data-access-admin-api-spec';
import { render, screen } from '@testing-library/react';
import { useWarmInvocationStatusDetails } from '@restate/data-access-admin-api-hooks';
import {
  AwaitingOn,
  AwaitingOnEntries,
  getAwaitedInvocationIds,
} from './AwaitingOn';

vi.mock('@restate/data-access-admin-api-hooks', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('@restate/data-access-admin-api-hooks')
  >()),
  useWarmInvocationStatusDetails: vi.fn(),
}));

vi.mock('../Entry', () => ({ Entry: () => null }));

const cancel = { Single: { SignalIndex: 1 } };
const completion = (id: number) => ({ Single: { CompletionId: id } });

function renderAwaitingOn(future: unknown) {
  return render(
    <AwaitingOn
      future={future as InvocationFuture}
      invocationId="inv_1"
      state="suspended"
      isPending
    />,
  );
}

describe('AwaitingOn', () => {
  it('hides the cancel signal wrapped in FirstCompleted', () => {
    renderAwaitingOn({ FirstCompleted: [cancel, completion(1)] });

    expect(screen.getByRole('button').textContent).toBe('awaiting 1 entry');
  });

  it('hides the cancel signal in a pre-v7 Unknown group', () => {
    renderAwaitingOn({ Unknown: [cancel, completion(1), completion(2)] });

    expect(screen.getByRole('button').textContent).toBe('awaiting 2 entries');
  });

  it('keeps an Unknown group without a cancel signal intact', () => {
    renderAwaitingOn({ Unknown: [completion(1), completion(2)] });

    expect(screen.getByRole('button').textContent).toBe('awaiting 2 entries');
  });
});

describe('getAwaitedInvocationIds', () => {
  const call = (invocationId: string, completionId: number) =>
    ({
      category: 'command',
      type: 'Call',
      invocationId,
      completionId,
    }) as JournalEntryV2;

  it('finds the called invocations behind nested awaited completions', () => {
    expect(
      getAwaitedInvocationIds(
        {
          AllCompleted: [
            completion(8),
            { FirstCompleted: [completion(9), cancel] },
          ],
        } as InvocationFuture,
        [call('inv_skipped', 7), call('inv_first', 8), call('inv_second', 9)],
      ),
    ).toEqual(['inv_first', 'inv_second']);
  });

  it('ignores awaited entries that call nothing', () => {
    expect(
      getAwaitedInvocationIds(completion(2) as InvocationFuture, [
        { category: 'command', type: 'Run', completionId: 2 } as JournalEntryV2,
      ]),
    ).toEqual([]);
  });
});

describe('AwaitingOnEntries', () => {
  it('asks for the statuses of the calls it shows', () => {
    render(
      <AwaitingOnEntries
        future={
          { AllCompleted: [completion(8), completion(9)] } as InvocationFuture
        }
        invocation={
          {
            id: 'inv_parent',
            journal: {
              entries: [
                {
                  category: 'command',
                  type: 'Call',
                  invocationId: 'inv_first',
                  completionId: 8,
                },
                {
                  category: 'command',
                  type: 'Call',
                  invocationId: 'inv_second',
                  completionId: 9,
                },
              ],
            },
          } as NonNullable<
            Parameters<typeof AwaitingOnEntries>[0]['invocation']
          >
        }
        isPending
      />,
    );

    expect(useWarmInvocationStatusDetails).toHaveBeenLastCalledWith(
      ['inv_first', 'inv_second'],
      'inv_parent',
      expect.objectContaining({ enabled: true, refetchInterval: false }),
    );
  });
});
