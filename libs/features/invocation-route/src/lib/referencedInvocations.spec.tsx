import type { JournalEntryV2 } from '@restate/data-access-admin-api-spec';
import {
  getEventRelatedInvocationIds,
  getReferencedInvocationIds,
} from './referencedInvocations';

function call(
  invocationId: string,
  commandIndex: number,
  completionId: number,
  fields: Partial<JournalEntryV2> = {},
) {
  return {
    category: 'command',
    type: 'Call',
    invocationId,
    commandIndex,
    completionId,
    ...fields,
  } as JournalEntryV2;
}

const run = {
  category: 'command',
  type: 'Run',
  commandIndex: 1,
  completionId: 2,
} as JournalEntryV2;

describe('getReferencedInvocationIds', () => {
  it('asks for the invocations that visible rows call', () => {
    expect(
      getReferencedInvocationIds([
        { invocationId: 'inv_root', depth: 0, entry: call('inv_a', 3, 7) },
        { invocationId: 'inv_root', depth: 0, entry: run },
        undefined,
      ]),
    ).toEqual(['inv_a']);
  });

  it("asks for a visible row's parent command even when that call is off screen", () => {
    const offScreenCall = call('inv_parent', 3, 7);
    expect(
      getReferencedInvocationIds([
        {
          invocationId: 'inv_root',
          depth: 0,
          entry: {
            category: 'notification',
            type: 'Call',
            completionId: 7,
          } as JournalEntryV2,
          parentCommand: offScreenCall,
        },
      ]),
    ).toEqual(['inv_parent']);
  });

  it('asks for each invocation once', () => {
    const shared = call('inv_a', 3, 7);
    expect(
      getReferencedInvocationIds([
        { invocationId: 'inv_root', depth: 0, entry: shared },
        {
          invocationId: 'inv_root',
          depth: 0,
          entry: { category: 'notification', type: 'Call' } as JournalEntryV2,
          parentCommand: shared,
        },
      ]),
    ).toEqual(['inv_a']);
  });
});

describe('getEventRelatedInvocationIds', () => {
  it('asks for the call an error or pause event relates to', () => {
    expect(
      getEventRelatedInvocationIds([
        call('inv_a', 3, 7),
        call('inv_failing', 4, 8),
        {
          category: 'event',
          type: 'Event: TransientError',
          relatedCommandIndex: 4,
        } as JournalEntryV2,
      ]),
    ).toEqual(['inv_failing']);
  });

  it('leaves out calls no event relates to, even ones being awaited', () => {
    expect(
      getEventRelatedInvocationIds([
        call('inv_a', 3, 7, { isAwaitingOn: true }),
        call('inv_b', 4, 8, { isAwaitingOn: true }),
        run,
      ]),
    ).toEqual([]);
  });

  it('never asks for commands that call nothing', () => {
    expect(
      getEventRelatedInvocationIds([
        run,
        {
          category: 'event',
          type: 'Event: TransientError',
          relatedCommandIndex: 1,
        } as JournalEntryV2,
      ]),
    ).toEqual([]);
  });
});
