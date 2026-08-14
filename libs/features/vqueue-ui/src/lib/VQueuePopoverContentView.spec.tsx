import type { VqueueSnapshot } from '@restate/data-access/admin-api-spec';
import { SnapshotTimeProvider } from '@restate/util/snapshot-time';
import { fireEvent, render, screen } from '@testing-library/react';
import {
  VQueueInboxPopoverContent,
  VQueuePopoverContent,
} from './VQueuePopoverContent';

const snapshot: VqueueSnapshot = {
  identity: {
    service: 'ExampleService',
    isPaused: false,
    vqueueId: 'vq_example',
  },
  status: {
    blocked: false,
  },
  counts: {
    inbox: 0,
    running: 2,
    suspended: 0,
    paused: 3,
    finished: 0,
  },
  stageAvg: {
    queue: 'PT10S',
    running: 'PT8S',
    suspended: 'PT6S',
  },
  events: {},
  head: {
    totalBlocks: [],
    nowBlocks: [],
    avgBlocks: [],
  },
};

const inboxSnapshot: VqueueSnapshot = {
  ...snapshot,
  counts: {
    inbox: 19,
    running: 0,
    suspended: 0,
    paused: 0,
    finished: 0,
  },
  head: {
    entryId: 'inv_head',
    stage: 'inbox',
    status: 'new',
    totalBlocks: [],
    nowBlocks: [],
    avgBlocks: [],
  },
  focusEntry: {
    id: 'inv_focused',
    stage: 'inbox',
    status: 'yielded',
    position: 12,
    attempts: 4,
    firstRunnableAt: new Date(Date.now() - 25_229).toISOString(),
    totalBlocks: [],
    latestBlocks: [],
  },
};

describe('VQueuePopoverContent', () => {
  it('does not highlight a stale row stage without a fresh focused entry', () => {
    render(<VQueuePopoverContent data={snapshot} focusStage="running" />);

    const running = screen.getByRole('listitem', { name: /Running/ });

    expect(running.className).not.toContain('shadow-xs');
    expect(running.className).not.toContain('border-black/10');
  });

  it('renders the Inbox queue without the stage summary rail', () => {
    render(<VQueueInboxPopoverContent data={inboxSnapshot} />);

    const inboxTitle = screen.getByText('Inbox');
    expect(inboxTitle.nextElementSibling?.textContent).toBe('19');
    expect(screen.queryByText('vq_example')).toBeNull();
    expect(screen.queryByRole('list', { name: 'Entry stages' })).toBeNull();
    expect(
      screen.getByRole('img', {
        name: /Selected entry has 11 entries ahead.*times the historical average/,
      }),
    ).toBeTruthy();
    expect(screen.getByText('avg')).toBeTruthy();
  });

  it('measures an eligible back-off Inbox wait from its retry deadline', () => {
    const lastSnapshot = new Date('2026-01-01T00:01:00.000Z').getTime();

    render(
      <SnapshotTimeProvider lastSnapshot={lastSnapshot}>
        <VQueueInboxPopoverContent
          data={{
            ...inboxSnapshot,
            stageAvg: { ...inboxSnapshot.stageAvg, queue: 'PT10S' },
            focusEntry: {
              ...inboxSnapshot.focusEntry!,
              status: 'backing-off',
              transitionedAt: '2026-01-01T00:00:30.000Z',
              nextAt: '2026-01-01T00:00:55.000Z',
            },
          }}
        />
      </SnapshotTimeProvider>,
    );

    expect(
      screen.getByRole('img', {
        name: /current queue time is 5s, 0.5 times the historical average/i,
      }),
    ).toBeTruthy();
  });

  it('uses the shared blocked status for the queue head', async () => {
    render(
      <VQueuePopoverContent
        data={{
          ...snapshot,
          status: {
            blocked: true,
            scheduling: 'blocked',
            blockedOn: 'concurrency_rules',
          },
          counts: { ...snapshot.counts, inbox: 1 },
          head: {
            entryId: 'inv_head',
            stage: 'inbox',
            status: 'new',
            totalBlocks: [],
            nowBlocks: [],
            avgBlocks: [],
          },
        }}
      />,
    );

    expect(screen.getByText('Blocked')).toBeTruthy();

    fireEvent.click(
      screen.getByRole('button', { name: 'on concurrency rule' }),
    );

    expect(await screen.findByText('Blocked on')).toBeTruthy();
  });

  it('uses the shared scheduled status for the queue head', () => {
    render(
      <SnapshotTimeProvider lastSnapshot={Date.parse('2026-08-14T09:00:00Z')}>
        <VQueuePopoverContent
          data={{
            ...snapshot,
            status: {
              blocked: false,
              scheduling: 'scheduled',
              scheduledAt: '2026-08-14T09:04:33Z',
            },
            counts: { ...snapshot.counts, inbox: 1 },
            head: {
              entryId: 'inv_head',
              stage: 'inbox',
              status: 'scheduled',
              totalBlocks: [],
              nowBlocks: [],
              avgBlocks: [],
            },
          }}
        />
      </SnapshotTimeProvider>,
    );

    expect(screen.getByText('Scheduled')).toBeTruthy();
    expect(screen.getByText('4m 33s')).toBeTruthy();
  });

  it('uses the shared ready status for the queue head', () => {
    render(
      <VQueuePopoverContent
        data={{
          ...snapshot,
          status: {
            blocked: false,
            scheduling: 'ready',
          },
          counts: { ...snapshot.counts, inbox: 1 },
          head: {
            entryId: 'inv_head',
            stage: 'inbox',
            status: 'new',
            totalBlocks: [],
            nowBlocks: [],
            avgBlocks: [],
          },
        }}
      />,
    );

    expect(screen.getByText('Ready').className).toContain('border-dashed');
  });
});
