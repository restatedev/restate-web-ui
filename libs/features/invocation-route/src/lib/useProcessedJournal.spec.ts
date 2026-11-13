import { renderHook } from '@testing-library/react';
import type { JournalEntryV2 } from '@restate/data-access-admin-api-spec';
import type { JournalDetail } from '@restate/features-invocation-ui';
import { useProcessedJournal } from './useProcessedJournal';

type Data = Parameters<typeof useProcessedJournal>[1];

const COMPACT: JournalDetail = {
  errors: false,
  completions: false,
  lifecycle: false,
  hidden: false,
  size: false,
};

const START = '2026-11-13T10:00:00.000Z';
const END = '2026-11-13T10:00:01.000Z';

function lifecycle(index: number, type: string): JournalEntryV2 {
  return {
    index,
    category: 'event',
    type,
    start: START,
    end: END,
    isPending: false,
  } as JournalEntryV2;
}

function command(
  index: number,
  commandIndex: number,
  type: string,
  invocationId?: string,
): JournalEntryV2 {
  return {
    index,
    commandIndex,
    category: 'command',
    type,
    start: START,
    invocationId,
  } as JournalEntryV2;
}

function invocation(
  id: string,
  entries: JournalEntryV2[],
  invokedById?: string,
) {
  return {
    id,
    invoked_by_id: invokedById,
    created_at: START,
    completed_at: END,
    journal: { entries },
  };
}

function rows(data: Data, rootId = 'inv_root') {
  const { result } = renderHook(() =>
    useProcessedJournal(rootId, data, COMPACT, new Map()),
  );
  return result.current.entriesWithoutInput.map(
    ({ invocationId, depth, entry }) =>
      `${depth} ${invocationId} ${entry?.type ?? 'placeholder'}`,
  );
}

describe('useProcessedJournal', () => {
  it('nests a sent invocation under its send without repeating who invoked it', () => {
    const data = {
      inv_root: invocation('inv_root', [
        lifecycle(0, 'Created'),
        lifecycle(1, 'Pending'),
        lifecycle(2, 'Running'),
        command(3, 1, 'OneWayCall', 'inv_child'),
        command(4, 2, 'Output'),
      ]),
      inv_child: invocation(
        'inv_child',
        [
          lifecycle(0, 'Created'),
          lifecycle(1, 'Pending'),
          lifecycle(2, 'Running'),
          command(3, 1, 'Run'),
        ],
        'inv_root',
      ),
    } as unknown as Data;

    expect(rows(data)).toEqual([
      '0 inv_root Created',
      '0 inv_root Pending',
      '0 inv_root Running',
      '0 inv_root OneWayCall',
      '1 inv_child Pending',
      '1 inv_child Running',
      '1 inv_child Run',
      '0 inv_root Output',
    ]);
  });

  it('keeps how an attached invocation started when someone else invoked it', () => {
    const data = {
      inv_root: invocation('inv_root', [
        command(0, 1, 'AttachInvocation', 'inv_other'),
      ]),
      inv_other: invocation(
        'inv_other',
        [lifecycle(0, 'Created'), command(1, 1, 'Run')],
        'inv_elsewhere',
      ),
    } as unknown as Data;

    expect(rows(data)).toEqual([
      '0 inv_root AttachInvocation',
      '1 inv_other Created',
      '1 inv_other Run',
    ]);
  });

  it('nests an invocation that is sent and then attached to under the attach', () => {
    const data = {
      inv_root: invocation('inv_root', [
        command(0, 1, 'OneWayCall', 'inv_wf'),
        command(1, 2, 'Run'),
        command(2, 3, 'AttachInvocation', 'inv_wf'),
        command(3, 4, 'Output'),
      ]),
      inv_wf: invocation('inv_wf', [command(0, 1, 'Run')], 'inv_root'),
    } as unknown as Data;

    expect(rows(data)).toEqual([
      '0 inv_root OneWayCall',
      '0 inv_root Run',
      '0 inv_root AttachInvocation',
      '1 inv_wf Run',
      '0 inv_root Output',
    ]);
  });

  it('keeps a nested invocation that is still queued', () => {
    const data = {
      inv_root: invocation('inv_root', [command(0, 1, 'Call', 'inv_child')]),
      inv_child: invocation(
        'inv_child',
        [{ ...lifecycle(0, 'Pending'), end: undefined, isPending: true }],
        'inv_root',
      ),
    } as unknown as Data;

    expect(rows(data)).toEqual(['0 inv_root Call', '1 inv_child Pending']);
  });
});
