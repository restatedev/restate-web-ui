import type { JournalEntryV2 } from '@restate/data-access-admin-api-spec';
import { isEntryCompletionAmbiguous } from './isEntryCompletionAmbiguous';

type Invocation = Parameters<typeof isEntryCompletionAmbiguous>[1];

const pendingCall = {
  category: 'command',
  type: 'Call',
  isPending: true,
  start: '2026-11-12T10:00:00.000Z',
} as JournalEntryV2;

const cancel = {
  category: 'notification',
  type: 'Cancel',
  start: '2026-11-12T10:00:05.000Z',
} as JournalEntryV2;

function invocation(
  fields: Partial<NonNullable<Invocation>>,
  entries: JournalEntryV2[] = [],
) {
  return { ...fields, journal: { entries } } as Invocation;
}

describe('isEntryCompletionAmbiguous', () => {
  it('is not ambiguous for a completed entry', () => {
    expect(
      isEntryCompletionAmbiguous(
        { ...pendingCall, isPending: false } as JournalEntryV2,
        invocation({ completed_at: '2026-11-12T10:01:00.000Z' }, [cancel]),
      ),
    ).toEqual({ isAmbiguous: false });
  });

  it('is not ambiguous for a pending call of a running invocation', () => {
    expect(
      isEntryCompletionAmbiguous(
        pendingCall,
        invocation({ status: 'running' }),
      ),
    ).toEqual({ isAmbiguous: false });
  });

  it('ends a pending call at a later cancel', () => {
    expect(
      isEntryCompletionAmbiguous(
        pendingCall,
        invocation({ status: 'running' }, [pendingCall, cancel]),
      ),
    ).toEqual({
      isAmbiguous: true,
      mode: 'cancelled',
      unambiguousEnd: cancel.start,
    });
  });

  it('ignores a cancel that came before the entry', () => {
    expect(
      isEntryCompletionAmbiguous(
        pendingCall,
        invocation({ status: 'running' }, [
          { ...cancel, start: '2026-11-12T09:59:00.000Z' } as JournalEntryV2,
          pendingCall,
        ]),
      ),
    ).toEqual({ isAmbiguous: false });
  });

  it('ends a pending call when the invocation is paused', () => {
    const modified_at = '2026-11-12T10:00:09.000Z';
    expect(
      isEntryCompletionAmbiguous(
        pendingCall,
        invocation({ status: 'paused', modified_at }, [pendingCall]),
      ),
    ).toEqual({
      isAmbiguous: true,
      mode: 'paused',
      unambiguousEnd: modified_at,
    });
  });

  it('ends a pending call when the invocation completed', () => {
    const completed_at = '2026-11-12T10:01:00.000Z';
    expect(
      isEntryCompletionAmbiguous(
        pendingCall,
        invocation({ status: 'succeeded', completed_at }, [pendingCall]),
      ),
    ).toEqual({
      isAmbiguous: true,
      mode: 'completion',
      unambiguousEnd: completed_at,
    });
  });
});
