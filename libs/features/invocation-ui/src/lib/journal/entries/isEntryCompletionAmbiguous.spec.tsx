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

  it('ends at the cancel when it came before the completion', () => {
    expect(
      isEntryCompletionAmbiguous(
        pendingCall,
        invocation(
          { status: 'cancelled', completed_at: '2026-11-12T10:01:00.000Z' },
          [pendingCall, cancel],
        ),
      ),
    ).toEqual({
      isAmbiguous: true,
      mode: 'cancelled',
      unambiguousEnd: cancel.start,
    });
  });

  it('ends at the completion when it came before the cancel', () => {
    const completed_at = '2026-11-12T10:00:02.000Z';
    expect(
      isEntryCompletionAmbiguous(
        pendingCall,
        invocation({ status: 'cancelled', completed_at }, [
          pendingCall,
          cancel,
        ]),
      ),
    ).toEqual({
      isAmbiguous: true,
      mode: 'completion',
      unambiguousEnd: completed_at,
    });
  });

  it('labels the end when the server leaves off the milliseconds', () => {
    expect(
      isEntryCompletionAmbiguous(
        pendingCall,
        invocation({
          status: 'succeeded',
          completed_at: '2026-11-12T10:01:00Z',
        }),
      ),
    ).toEqual({
      isAmbiguous: true,
      mode: 'completion',
      unambiguousEnd: '2026-11-12T10:01:00Z',
    });
  });

  it('ignores a cancel at the entry instant written without milliseconds', () => {
    expect(
      isEntryCompletionAmbiguous(
        pendingCall,
        invocation({ status: 'running' }, [
          { ...cancel, start: '2026-11-12T10:00:00Z' } as JournalEntryV2,
          pendingCall,
        ]),
      ),
    ).toEqual({ isAmbiguous: false });
  });

  it('ends at the pause when it came before the cancel', () => {
    const modified_at = '2026-11-12T10:00:03.000Z';
    expect(
      isEntryCompletionAmbiguous(
        pendingCall,
        invocation({ status: 'paused', modified_at }, [pendingCall, cancel]),
      ),
    ).toEqual({
      isAmbiguous: true,
      mode: 'paused',
      unambiguousEnd: modified_at,
    });
  });

  it('picks up a cancel that a later journal added', () => {
    const withoutCancel = invocation({ status: 'running' }, [pendingCall]);
    expect(isEntryCompletionAmbiguous(pendingCall, withoutCancel)).toEqual({
      isAmbiguous: false,
    });
    expect(isEntryCompletionAmbiguous(pendingCall, withoutCancel)).toEqual({
      isAmbiguous: false,
    });
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
});
