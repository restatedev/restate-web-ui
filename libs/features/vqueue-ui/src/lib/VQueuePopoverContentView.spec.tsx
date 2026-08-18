import type { VqueueSnapshot } from '@restate/data-access/admin-api-spec';
import { SnapshotTimeProvider } from '@restate/util/snapshot-time';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import {
  VQueueInboxPopoverContent,
  VQueuePopoverContent,
} from './VQueuePopoverContent';

function renderPopover(children: ReactNode) {
  return render(<MemoryRouter>{children}</MemoryRouter>);
}

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
    renderPopover(
      <VQueuePopoverContent data={snapshot} focusStage="running" />,
    );

    const running = screen.getByRole('listitem', { name: /Running/ });

    expect(running.className).not.toContain('shadow-xs');
    expect(running.className).not.toContain('border-black/10');
  });

  it('renders the Inbox queue without the stage summary rail', () => {
    renderPopover(<VQueueInboxPopoverContent data={inboxSnapshot} />);

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

  it('links an invocation queue head to its invocation page', () => {
    renderPopover(<VQueueInboxPopoverContent data={inboxSnapshot} />);

    expect(
      screen
        .getByRole('link', { name: 'Open invocation inv_head' })
        .getAttribute('href'),
    ).toBe('/invocations/inv_head');
  });

  it('keeps a non-invocation queue head as plain text', () => {
    renderPopover(
      <VQueueInboxPopoverContent
        data={{
          ...inboxSnapshot,
          head: { ...inboxSnapshot.head, entryId: 'mut_head' },
        }}
      />,
    );

    expect(screen.getByText('mut_head')).toBeTruthy();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('measures an eligible back-off Inbox wait from its retry deadline', () => {
    const lastSnapshot = new Date('2026-01-01T00:01:00.000Z').getTime();
    const focusEntry = inboxSnapshot.focusEntry;
    if (!focusEntry) throw new Error('Expected a focused Inbox entry');

    renderPopover(
      <SnapshotTimeProvider lastSnapshot={lastSnapshot}>
        <VQueueInboxPopoverContent
          data={{
            ...inboxSnapshot,
            stageAvg: { ...inboxSnapshot.stageAvg, queue: 'PT10S' },
            focusEntry: {
              ...focusEntry,
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

  it('uses the shared blocked status for the queue head', () => {
    renderPopover(
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
    expect(screen.getByText('on concurrency rule')).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: 'on concurrency rule' }),
    ).toBeNull();
  });

  it('uses the shared scheduled status for the queue head', () => {
    renderPopover(
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
    renderPopover(
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
