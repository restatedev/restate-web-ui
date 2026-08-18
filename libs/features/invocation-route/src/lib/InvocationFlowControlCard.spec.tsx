import type {
  components,
  JournalEntryV2,
  VqueueSnapshot,
} from '@restate/data-access/admin-api-spec';
import { adminApi } from '@restate/data-access/admin-api';
import { SnapshotTimeProvider } from '@restate/util/snapshot-time';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { InvocationFlowControlCard } from './InvocationFlowControlCard';

type InvocationV2 = components['schemas']['InvocationV2'];

const snapshotTime = new Date('2026-01-01T00:01:00.000Z').getTime();

function invocation(
  vqueue: NonNullable<InvocationV2['vqueue']>,
  overrides: Partial<InvocationV2> = {},
): InvocationV2 {
  return {
    id: 'inv-focus',
    created_at: '2026-01-01T00:00:00.000Z',
    modified_at: '2026-01-01T00:01:00.000Z',
    scheduled_at: '2026-01-01T00:00:00.000Z',
    invoked_by: 'ingress',
    status: 'pending',
    target: 'ExampleService/run',
    target_handler_name: 'run',
    target_service_name: 'ExampleService',
    target_service_ty: 'service',
    vqueue_id: 'vq-example',
    limit_key: 'customer-42',
    vqueue,
    ...overrides,
  };
}

function snapshot(overrides: Partial<VqueueSnapshot> = {}): VqueueSnapshot {
  return {
    identity: {
      service: 'ExampleService',
      isPaused: false,
      vqueueId: 'vq-example',
      limitKey: 'customer-42',
    },
    status: {
      blocked: false,
    },
    counts: {
      inbox: 0,
      running: 0,
      suspended: 0,
      paused: 0,
      finished: 0,
    },
    stageAvg: {},
    events: {},
    head: {
      totalBlocks: [],
      nowBlocks: [],
      avgBlocks: [],
    },
    ...overrides,
  };
}

function renderWithQueryClient(
  children: ReactNode,
  prepare?: (queryClient: QueryClient) => void,
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  prepare?.(queryClient);
  return render(
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>,
  );
}

function renderCard(
  invocationData: InvocationV2,
  data?: VqueueSnapshot,
  journalEntries?: JournalEntryV2[],
  prepare?: (queryClient: QueryClient) => void,
) {
  return renderWithQueryClient(
    <SnapshotTimeProvider lastSnapshot={snapshotTime}>
      <InvocationFlowControlCard
        invocation={invocationData}
        data={data}
        journalEntries={journalEntries}
      />
    </SnapshotTimeProvider>,
    prepare,
  );
}

describe('InvocationFlowControlCard', () => {
  it('renders the live journey, aggregate activity, and only the focused head blocker', () => {
    renderCard(
      invocation(
        {
          vqueue_id: 'vq-example',
          stage: 'inbox',
          status: 'yielded',
          created_at: '2026-01-01T00:00:00.000Z',
          first_runnable_at: '2026-01-01T00:00:00.005Z',
          first_attempt_at: '2026-01-01T00:00:20.000Z',
          latest_attempt_at: '2026-01-01T00:00:45.000Z',
          transitioned_at: '2026-01-01T00:00:50.000Z',
          retry_attempts: 1_000,
          retry_count_since_last_stored_command: 12,
          num_attempts: 9,
          num_errors: 5,
        },
        { status: 'backing-off' },
      ),
      snapshot({
        status: {
          blocked: true,
          scheduling: 'blocked',
          blockedOn: 'concurrency_rules',
        },
        counts: {
          inbox: 19,
          running: 0,
          suspended: 0,
          paused: 0,
          finished: 0,
        },
        stageAvg: {
          queue: 'PT10S',
          endToEnd: 'PT30S',
        },
        head: {
          entryId: 'inv-focus',
          stage: 'inbox',
          status: 'yielded',
          totalBlocks: [],
          nowBlocks: [{ gate: 'concurrency_rules', duration: 'PT18S' }],
          avgBlocks: [{ gate: 'concurrency_rules', duration: 'PT6S' }],
        },
        focusEntry: {
          id: 'inv-focus',
          stage: 'inbox',
          status: 'yielded',
          position: 12,
          attempts: 9,
          errors: 5,
          yields: 2,
          pauses: 10,
          suspensions: 10,
          firstRunnableAt: '2026-01-01T00:00:00.005Z',
          firstAttemptAt: '2026-01-01T00:00:20.000Z',
          transitionedAt: '2026-01-01T00:00:50.000Z',
          totalBlocks: [],
          latestBlocks: [],
        },
      }),
    );

    expect(screen.getByRole('heading', { name: 'Lifecycle' })).toBeTruthy();
    expect(screen.getByText('Created').parentElement?.textContent).toContain(
      '1m ago',
    );
    expect(screen.getByText('Became runnable').parentElement?.textContent).toBe(
      'Became runnable after 5ms',
    );
    expect(screen.queryByText('Scheduled for')).toBeNull();
    expect(
      screen.getByTitle('Queue wait: 19.995s; 2× historical average'),
    ).toBeTruthy();
    expect(screen.getByText('1st attempt').parentElement?.textContent).toBe(
      '1st attempt started at 00:00:20',
    );
    const attemptGroup = screen.getByRole('group', { name: '9 attempts' });
    const attemptToggle = screen.getByRole('button', {
      name: 'Toggle 9 attempts',
    });
    expect(attemptToggle.parentElement?.parentElement?.className).toContain(
      'pl-5.5',
    );
    expect(attemptToggle.getAttribute('aria-expanded')).toBe('false');
    expect(attemptGroup.textContent).toContain('9 attemptsover30swith');
    fireEvent.click(attemptToggle);
    expect(attemptToggle.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText('9th attempt').parentElement?.textContent).toBe(
      '9th attempt started at 00:00:45',
    );
    expect(
      screen.getByRole('listitem', {
        name: 'Retries: 1,000 retries, 5 backoffs',
      }),
    ).toBeTruthy();
    const retries = screen.getByRole('button', {
      name: 'Retries: 1,000',
    });
    const backoffs = screen.getByLabelText('Backoffs: 5');
    expect(retries.textContent).toContain('1K');
    expect(retries.parentElement?.textContent).toBe('1K retries');
    expect(backoffs.textContent).toContain('5');
    expect(backoffs.parentElement?.textContent).toBe('5 backoffs');
    expect(backoffs.closest('button')).toBeNull();
    expect(
      screen.getByRole('listitem', { name: 'Yields: 1 yield' }),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Yields: 1' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Pauses: 10' })).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Suspensions: 10' }),
    ).toBeTruthy();
    expect(screen.getByText('on concurrency rule')).toBeTruthy();
    expect(
      screen.getByTitle('Blocked duration: 18s; 3× historical average'),
    ).toBeTruthy();
    expect(screen.queryByText('Pending')).toBeNull();
    expect(screen.queryByText('Backing-off')).toBeNull();
  });

  it('shows a future schedule as the runnable milestone', () => {
    renderCard(
      invocation(
        {
          vqueue_id: 'vq-example',
          stage: 'inbox',
          status: 'scheduled',
          next_at: '2026-01-01T00:03:00.000Z',
          created_at: '2026-01-01T00:00:00.000Z',
          first_runnable_at: '2026-01-01T00:03:00.000Z',
          transitioned_at: '2026-01-01T00:00:10.000Z',
          num_attempts: 0,
        },
        {
          status: 'scheduled',
          scheduled_start_at: '2026-01-01T00:03:00.000Z',
        },
      ),
      snapshot({
        status: {
          blocked: false,
          scheduling: 'scheduled',
          scheduledAt: '2026-01-01T00:03:00.000Z',
        },
        counts: {
          inbox: 1,
          running: 0,
          suspended: 0,
          paused: 0,
          finished: 0,
        },
        head: {
          entryId: 'inv-focus',
          stage: 'inbox',
          status: 'scheduled',
          nextAt: '2026-01-01T00:03:00.000Z',
          totalBlocks: [],
          nowBlocks: [],
          avgBlocks: [],
        },
        focusEntry: {
          id: 'inv-focus',
          stage: 'inbox',
          status: 'scheduled',
          position: 1,
          attempts: 0,
          firstRunnableAt: '2026-01-01T00:03:00.000Z',
          nextAt: '2026-01-01T00:03:00.000Z',
          totalBlocks: [],
          latestBlocks: [],
        },
      }),
    );

    expect(
      screen.getByText('Scheduled to run').parentElement?.textContent,
    ).toContain('in 2m');
    expect(screen.queryByText('Next transition')).toBeNull();
    expect(screen.queryByText('Scheduled')).toBeNull();
    expect(screen.queryByText('Became runnable')).toBeNull();
    expect(screen.queryByText('Queueing')).toBeNull();
    expect(screen.queryByText('1st attempt')).toBeNull();
  });

  it('shows an elapsed schedule as an eligible next attempt with its queue time', () => {
    renderCard(
      invocation(
        {
          vqueue_id: 'vq-example',
          stage: 'inbox',
          status: 'scheduled',
          next_at: '2026-01-01T00:00:10.000Z',
          created_at: '2026-01-01T00:00:00.000Z',
          first_runnable_at: '2026-01-01T00:00:10.000Z',
          transitioned_at: '2026-01-01T00:00:10.000Z',
          num_attempts: 0,
        },
        {
          status: 'scheduled',
          scheduled_start_at: '2026-01-01T00:00:10.000Z',
        },
      ),
      snapshot({
        status: {
          blocked: false,
          scheduling: 'scheduled',
          scheduledAt: '2026-01-01T00:00:10.000Z',
        },
        counts: {
          inbox: 1,
          running: 0,
          suspended: 0,
          paused: 0,
          finished: 0,
        },
        focusEntry: {
          id: 'inv-focus',
          stage: 'inbox',
          status: 'scheduled',
          position: 1,
          attempts: 0,
          firstRunnableAt: '2026-01-01T00:00:10.000Z',
          nextAt: '2026-01-01T00:00:10.000Z',
          totalBlocks: [],
          latestBlocks: [],
        },
      }),
    );

    expect(screen.getByText('Became runnable').parentElement?.textContent).toBe(
      'Became runnable after 10s',
    );
    expect(screen.queryByText('Queueing')).toBeNull();
    expect(screen.getByText('Next attempt')).toBeTruthy();
    expect(screen.queryByText('Pending')).toBeNull();
    expect(screen.getByText('50s')).toBeTruthy();
    expect(screen.queryByText('Becomes runnable')).toBeNull();
    expect(screen.queryByText('Next transition')).toBeNull();
    expect(screen.queryByText('1st attempt')).toBeNull();
  });

  it('keeps the current Inbox wait and comparison on the pending attempt', () => {
    renderCard(
      invocation({
        vqueue_id: 'vq-example',
        stage: 'inbox',
        status: 'new',
        created_at: '2026-01-01T00:00:00.000Z',
        first_runnable_at: '2026-01-01T00:00:50.000Z',
        transitioned_at: '2026-01-01T00:00:50.000Z',
        num_attempts: 0,
      }),
      snapshot({
        counts: {
          inbox: 8,
          running: 0,
          suspended: 0,
          paused: 0,
          finished: 0,
        },
        stageAvg: { queue: 'PT10S' },
        focusEntry: {
          id: 'inv-focus',
          stage: 'inbox',
          status: 'new',
          position: 6,
          attempts: 0,
          firstRunnableAt: '2026-01-01T00:00:50.000Z',
          transitionedAt: '2026-01-01T00:00:50.000Z',
          totalBlocks: [],
          latestBlocks: [],
        },
      }),
    );

    const pendingAttempt = screen.getByText('Next attempt').parentElement;
    expect(pendingAttempt?.textContent).toContain(
      'is waiting behind5 entriesfor10s',
    );
    expect(pendingAttempt?.className).toContain('whitespace-nowrap');
    const pendingMarker = pendingAttempt?.parentElement?.querySelector(
      '[aria-hidden="true"]',
    );
    expect(pendingMarker?.className).toContain('top-1/2');
    expect(pendingMarker?.className).toContain('-translate-y-1/2');
    expect(
      screen.getByRole('img', { name: '1× historical average' }),
    ).toBeTruthy();
    expect(screen.queryByText('Queueing')).toBeNull();
  });

  it('keeps the initial queue comparison when Inbox position is unavailable', () => {
    renderCard(
      invocation({
        vqueue_id: 'vq-example',
        stage: 'inbox',
        status: 'new',
        created_at: '2026-01-01T00:00:00.000Z',
        first_runnable_at: '2026-01-01T00:00:50.000Z',
        transitioned_at: '2026-01-01T00:00:50.000Z',
        num_attempts: 0,
      }),
      snapshot({
        counts: {
          inbox: 8,
          running: 0,
          suspended: 0,
          paused: 0,
          finished: 0,
        },
        stageAvg: { queue: 'PT10S' },
        focusEntry: {
          id: 'inv-focus',
          stage: 'inbox',
          status: 'new',
          attempts: 0,
          firstRunnableAt: '2026-01-01T00:00:50.000Z',
          transitionedAt: '2026-01-01T00:00:50.000Z',
          totalBlocks: [],
          latestBlocks: [],
        },
      }),
    );

    const pendingAttempt = screen.getByText('Next attempt').parentElement;
    expect(pendingAttempt?.textContent).toContain('is waiting for10s');
    expect(pendingAttempt?.textContent).not.toContain('behind');
    expect(
      screen.getByRole('img', { name: '1× historical average' }),
    ).toBeTruthy();
  });

  it('moves an Inbox backing-off state onto the next attempt', () => {
    const journalEntries: JournalEntryV2[] = [
      {
        category: 'command',
        type: 'Run',
        index: 4,
        commandIndex: 2,
      },
      {
        category: 'event',
        type: 'Event: TransientError',
        index: 9,
        start: '2026-01-01T00:00:40.000Z',
        message: 'Database unavailable',
        relatedRestateErrorCode: '500',
        relatedCommandIndex: 2,
      },
      {
        category: 'event',
        type: 'Event: TransientError',
        index: 10,
        start: '2026-01-01T00:00:50.000Z',
        message: 'Database unavailable',
        relatedRestateErrorCode: '500',
        relatedCommandIndex: 2,
      },
    ];
    renderCard(
      invocation(
        {
          vqueue_id: 'vq-example',
          stage: 'inbox',
          status: 'backing-off',
          next_at: '2026-01-01T00:01:30.000Z',
          created_at: '2026-01-01T00:00:00.000Z',
          first_runnable_at: '2026-01-01T00:00:00.004Z',
          first_attempt_at: '2026-01-01T00:00:00.031Z',
          latest_attempt_at: '2026-01-01T00:00:55.000Z',
          transitioned_at: '2026-01-01T00:00:55.000Z',
          retry_attempts: 1_000,
          retry_count_since_last_stored_command: 12,
          num_attempts: 18,
          num_errors: 5,
        },
        {
          status: 'backing-off',
          next_retry_at: '2026-01-01T00:01:30.000Z',
        },
      ),
      snapshot({
        stageAvg: { queue: 'PT0.018S', endToEnd: 'PT36S' },
        focusEntry: {
          id: 'inv-focus',
          stage: 'inbox',
          status: 'backing-off',
          attempts: 18,
          errors: 5,
          firstRunnableAt: '2026-01-01T00:00:00.004Z',
          firstAttemptAt: '2026-01-01T00:00:00.031Z',
          transitionedAt: '2026-01-01T00:00:55.000Z',
          nextAt: '2026-01-01T00:01:30.000Z',
          totalBlocks: [],
          latestBlocks: [],
        },
      }),
      journalEntries,
    );

    expect(
      screen.getByText('18th attempt').parentElement?.textContent,
    ).not.toContain('Backing-off');
    expect(screen.getByText('Next attempt')).toBeTruthy();
    expect(screen.getByText('Backing-off')).toBeTruthy();
    expect(screen.getByText(/for 30s/)).toBeTruthy();
    expect(screen.queryByText(/entries/)).toBeNull();
    expect(screen.queryByText(/in queue/)).toBeNull();
    expect(
      screen.getByRole('listitem', {
        name: 'Retries: 1,000 retries, 4 backoffs',
      }),
    ).toBeTruthy();
    expect(screen.getByLabelText('Backoffs: 4').closest('button')).toBeNull();

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Retries: 1,000',
      }),
    );
    expect(screen.getByText('Transient errors')).toBeTruthy();
    expect(screen.queryByText(/backoffs followed transient errors/)).toBeNull();
    expect(
      screen.getByText(
        'Deduplicated transient errors from the invocation journal.',
      ),
    ).toBeTruthy();
    expect(screen.getAllByText('Database unavailable')).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: '#2' })).toHaveLength(2);
  });

  it('shows queue position without relabeling an eligible back-off as Pending', () => {
    renderCard(
      invocation(
        {
          vqueue_id: 'vq-example',
          stage: 'inbox',
          status: 'backing-off',
          next_at: '2026-01-01T00:00:55.000Z',
          created_at: '2026-01-01T00:00:00.000Z',
          first_runnable_at: '2026-01-01T00:00:00.000Z',
          first_attempt_at: '2026-01-01T00:00:10.000Z',
          latest_attempt_at: '2026-01-01T00:00:40.000Z',
          transitioned_at: '2026-01-01T00:00:45.000Z',
          num_attempts: 2,
        },
        { status: 'backing-off' },
      ),
      snapshot({
        counts: {
          inbox: 6,
          running: 0,
          suspended: 0,
          paused: 0,
          finished: 0,
        },
        stageAvg: { queue: 'PT10S' },
        focusEntry: {
          id: 'inv-focus',
          stage: 'inbox',
          status: 'backing-off',
          position: 3,
          attempts: 2,
          transitionedAt: '2026-01-01T00:00:45.000Z',
          nextAt: '2026-01-01T00:00:55.000Z',
          totalBlocks: [],
          latestBlocks: [],
        },
      }),
    );

    expect(screen.queryByText('Backing-off')).toBeNull();
    expect(screen.queryByText('Pending')).toBeNull();
    expect(screen.getByText('2 entries')).toBeTruthy();
    const nextAttempt = screen.getByText('Next attempt').parentElement;
    expect(nextAttempt?.textContent).toContain(
      'is waiting behind2 entriesfor5s',
    );
    expect(screen.queryByText('queued for')).toBeNull();
    expect(
      screen.queryByRole('img', { name: '0.5× historical average' }),
    ).toBeNull();
  });

  it('shows a neutral wait without comparison when Inbox position is unavailable', () => {
    renderCard(
      invocation(
        {
          vqueue_id: 'vq-example',
          stage: 'inbox',
          status: 'backing-off',
          next_at: '2026-01-01T00:00:55.000Z',
          created_at: '2026-01-01T00:00:00.000Z',
          first_runnable_at: '2026-01-01T00:00:00.000Z',
          first_attempt_at: '2026-01-01T00:00:10.000Z',
          latest_attempt_at: '2026-01-01T00:00:40.000Z',
          transitioned_at: '2026-01-01T00:00:45.000Z',
          num_attempts: 2,
        },
        { status: 'backing-off' },
      ),
      snapshot({
        counts: {
          inbox: 6,
          running: 0,
          suspended: 0,
          paused: 0,
          finished: 0,
        },
        stageAvg: { queue: 'PT10S' },
        focusEntry: {
          id: 'inv-focus',
          stage: 'inbox',
          status: 'backing-off',
          attempts: 2,
          transitionedAt: '2026-01-01T00:00:45.000Z',
          nextAt: '2026-01-01T00:00:55.000Z',
          totalBlocks: [],
          latestBlocks: [],
        },
      }),
    );

    const nextAttempt = screen.getByText('Next attempt').parentElement;
    expect(nextAttempt?.textContent).toContain('is waiting for5s');
    expect(nextAttempt?.textContent).not.toContain('behind');
    expect(nextAttempt?.className).toContain('whitespace-nowrap');
    expect(screen.queryByText('Backing-off')).toBeNull();
    expect(screen.queryByText('Pending')).toBeNull();
    expect(screen.queryByText('queued for')).toBeNull();
    expect(
      screen.queryByRole('img', { name: '0.5× historical average' }),
    ).toBeNull();
  });

  it('shows the scheduler block after a backing-off attempt becomes eligible', () => {
    renderCard(
      invocation(
        {
          vqueue_id: 'vq-example',
          stage: 'inbox',
          status: 'backing-off',
          next_at: '2026-01-01T00:00:55.000Z',
          created_at: '2026-01-01T00:00:00.000Z',
          first_runnable_at: '2026-01-01T00:00:00.000Z',
          first_attempt_at: '2026-01-01T00:00:10.000Z',
          latest_attempt_at: '2026-01-01T00:00:40.000Z',
          transitioned_at: '2026-01-01T00:00:45.000Z',
          num_attempts: 2,
        },
        { status: 'backing-off' },
      ),
      snapshot({
        status: {
          blocked: true,
          scheduling: 'blocked',
          blockedOn: 'concurrency_rules',
        },
        head: {
          entryId: 'inv-focus',
          stage: 'inbox',
          status: 'backing-off',
          totalBlocks: [{ gate: 'lock', duration: 'PT2S' }],
          nowBlocks: [{ gate: 'concurrency_rules', duration: 'PT5S' }],
          avgBlocks: [{ gate: 'concurrency_rules', duration: 'PT2S' }],
        },
        focusEntry: {
          id: 'inv-focus',
          stage: 'inbox',
          status: 'backing-off',
          position: 1,
          attempts: 2,
          transitionedAt: '2026-01-01T00:00:45.000Z',
          nextAt: '2026-01-01T00:00:55.000Z',
          totalBlocks: [{ gate: 'lock', duration: 'PT2S' }],
          latestBlocks: [{ gate: 'lock', duration: 'PT1S' }],
        },
      }),
    );

    expect(screen.getByText('on concurrency rule')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Blocked time:/ })).toBeNull();
    expect(
      screen.queryByRole('button', { name: /Last attempt blocked time:/ }),
    ).toBeNull();
    expect(screen.getByText('Queued')).toBeTruthy();
    expect(screen.queryByText('Became runnable')).toBeNull();
    expect(screen.queryByText('Backing-off')).toBeNull();
    expect(screen.queryByText('Pending')).toBeNull();
    expect(screen.queryByText(/entries/)).toBeNull();
  });

  it('shows the live block only on the current attempt', () => {
    renderCard(
      invocation({
        vqueue_id: 'vq-example',
        stage: 'inbox',
        status: 'new',
        created_at: '2026-01-01T00:00:00.000Z',
        first_runnable_at: '2026-01-01T00:00:00.000Z',
        num_attempts: 0,
      }),
      snapshot({
        status: {
          blocked: true,
          scheduling: 'blocked',
          blockedOn: 'concurrency_rules',
        },
        stageAvg: { queue: 'PT30S' },
        head: {
          entryId: 'inv-focus',
          stage: 'inbox',
          status: 'new',
          totalBlocks: [],
          nowBlocks: [
            { gate: 'lock', duration: 'PT2S' },
            { gate: 'concurrency_rules', duration: 'PT5S' },
          ],
          avgBlocks: [{ gate: 'concurrency_rules', duration: 'PT2S' }],
        },
        focusEntry: {
          id: 'inv-focus',
          stage: 'inbox',
          status: 'new',
          attempts: 0,
          firstRunnableAt: '2026-01-01T00:00:00.000Z',
          totalBlocks: [],
          latestBlocks: [],
        },
      }),
    );

    expect(screen.queryByText('Became runnable')).toBeNull();
    expect(screen.queryByText('Queueing')).toBeNull();
    expect(screen.getByText('Queued')).toBeTruthy();
    expect(screen.getByTitle(/Queued time: 53s/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Blocked time:/ })).toBeNull();
    expect(screen.getByText('on concurrency rule')).toBeTruthy();
  });

  it('separates blocks from earlier attempts and the latest attempt by gate', () => {
    renderCard(
      invocation({
        vqueue_id: 'vq-example',
        stage: 'finished',
        status: 'finished',
        created_at: '2026-01-01T00:00:00.000Z',
        first_runnable_at: '2026-01-01T00:00:01.000Z',
        first_attempt_at: '2026-01-01T00:00:20.000Z',
        latest_attempt_at: '2026-01-01T00:00:40.000Z',
        transitioned_at: '2026-01-01T00:00:50.000Z',
        num_attempts: 2,
      }),
      snapshot({
        head: {
          totalBlocks: [],
          nowBlocks: [],
          avgBlocks: [
            { gate: 'lock', duration: 'PT2S' },
            { gate: 'concurrency_rules', duration: 'PT2S' },
          ],
        },
        focusEntry: {
          id: 'inv-focus',
          stage: 'finished',
          status: 'succeeded',
          attempts: 2,
          firstRunnableAt: '2026-01-01T00:00:01.000Z',
          firstAttemptAt: '2026-01-01T00:00:20.000Z',
          transitionedAt: '2026-01-01T00:00:50.000Z',
          totalBlocks: [
            { gate: 'lock', duration: 'PT5S' },
            { gate: 'concurrency_rules', duration: 'PT4S' },
          ],
          latestBlocks: [
            { gate: 'lock', duration: 'PT2S' },
            { gate: 'concurrency_rules', duration: 'PT4S' },
          ],
        },
      }),
    );

    expect(
      screen.getByRole('button', {
        name: 'Blocked time: 9s; 2.3 times historical average',
      }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Toggle 2 attempts' }));
    expect(
      screen.getByRole('button', {
        name: 'Last attempt blocked time: 6s; 1.5 times historical average',
      }),
    ).toBeTruthy();
  });

  it('shows historical block time after queueing with per-gate comparisons', () => {
    renderCard(
      invocation(
        {
          vqueue_id: 'vq-example',
          stage: 'finished',
          status: 'succeeded',
          created_at: '2026-01-01T00:00:00.000Z',
          first_runnable_at: '2026-01-01T00:00:00.000Z',
          first_attempt_at: '2026-01-01T00:00:10.000Z',
          latest_attempt_at: '2026-01-01T00:00:10.000Z',
          transitioned_at: '2026-01-01T00:00:20.000Z',
          num_attempts: 1,
        },
        {
          status: 'succeeded',
          completed_at: '2026-01-01T00:00:20.000Z',
        },
      ),
      snapshot({
        head: {
          totalBlocks: [],
          nowBlocks: [],
          avgBlocks: [
            { gate: 'lock', duration: 'PT1S' },
            { gate: 'concurrency_rules', duration: 'PT2S' },
          ],
        },
        focusEntry: {
          id: 'inv-focus',
          stage: 'finished',
          status: 'succeeded',
          attempts: 1,
          firstRunnableAt: '2026-01-01T00:00:00.000Z',
          firstAttemptAt: '2026-01-01T00:00:10.000Z',
          transitionedAt: '2026-01-01T00:00:20.000Z',
          totalBlocks: [
            { gate: 'lock', duration: 'PT2S' },
            { gate: 'concurrency_rules', duration: 'PT6S' },
          ],
          latestBlocks: [
            { gate: 'lock', duration: 'PT2S' },
            { gate: 'concurrency_rules', duration: 'PT6S' },
          ],
        },
      }),
    );

    const queued = screen.getByText('Queued');
    const blocked = screen.getByText('Blocked');
    const queuePhase = queued.parentElement?.parentElement;
    const blockedPhase = blocked.parentElement?.parentElement;
    const attempt = screen.getByText('Attempt').parentElement;
    expect(queuePhase?.nextElementSibling).toBe(blockedPhase);
    expect(queuePhase?.className).toContain('pl-5.5');
    expect(blockedPhase?.className).toContain('pl-5.5');
    expect(blockedPhase?.className).toContain('-mt-1');
    expect(queued.nextElementSibling?.textContent).toBe('for');
    expect(queued.nextElementSibling?.className).toContain('text-gray-400');
    expect(blocked.nextElementSibling?.textContent).toBe('for');
    expect(blocked.nextElementSibling?.className).toContain('text-gray-400');
    expect(blocked.parentElement?.className).toContain('text-xs');
    expect(attempt?.textContent).toContain('Lasted10s');
    expect(attempt?.textContent).not.toContain('blocked for');
    const blockedTime = screen.getByRole('button', {
      name: 'Blocked time: 8s; 2.7 times historical average',
    });
    expect(blockedTime).toBeTruthy();

    fireEvent.click(blockedTime);
    expect(
      screen.getByTitle(
        'object lock blocked time: 2s; 2× historical average (1s)',
      ),
    ).toBeTruthy();
    expect(
      screen.getByTitle(
        'concurrency rule blocked time: 6s; 3× historical average (2s)',
      ),
    ).toBeTruthy();
  });

  it('keeps a running VQueue attempt Running when other status sources report backing-off', () => {
    renderCard(
      invocation(
        {
          vqueue_id: 'vq-example',
          stage: 'running',
          status: 'backing-off',
          created_at: '2026-01-01T00:00:00.000Z',
          first_runnable_at: '2026-01-01T00:00:00.004Z',
          first_attempt_at: '2026-01-01T00:00:00.031Z',
          latest_attempt_at: '2026-01-01T00:00:55.000Z',
          retry_attempts: 2,
          retry_count_since_last_stored_command: 2,
          num_attempts: 2,
        },
        { status: 'backing-off' },
      ),
      snapshot({
        focusEntry: {
          id: 'inv-focus',
          stage: 'running',
          status: 'backing-off',
          attempts: 2,
          totalBlocks: [],
          latestBlocks: [],
        },
      }),
    );

    expect(screen.getByText('2nd attempt')).toBeTruthy();
    expect(screen.getByText('Running')).toBeTruthy();
    expect(screen.getByText('Running for')).toBeTruthy();
    expect(screen.getByText('Running for').closest('.min-h-8')).toBeTruthy();
    expect(screen.getByRole('button', { name: '2nd attempt' })).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: 'Toggle 2 attempts' }),
    ).toBeNull();
    expect(screen.queryByText('Backing-off')).toBeNull();
    expect(screen.queryByText('Retries')).toBeNull();
  });

  it('keeps a running invocation Running when VQueue retry metadata says backing-off', () => {
    renderCard(
      invocation(
        {
          vqueue_id: 'vq-example',
          stage: 'running',
          status: 'backing-off',
          created_at: '2026-01-01T00:00:00.000Z',
          first_runnable_at: '2026-01-01T00:00:00.004Z',
          first_attempt_at: '2026-01-01T00:00:00.031Z',
          latest_attempt_at: '2026-01-01T00:00:55.000Z',
          retry_count_since_last_stored_command: 2,
          num_attempts: 3,
        },
        {
          status: 'running',
          last_awaiting_on_future_json: { Single: { CompletionId: 4 } },
        },
      ),
      snapshot({
        focusEntry: {
          id: 'inv-focus',
          stage: 'running',
          status: 'backing-off',
          attempts: 3,
          totalBlocks: [],
          latestBlocks: [],
        },
      }),
    );

    expect(screen.getByText('3rd attempt')).toBeTruthy();
    expect(screen.getByText('Running')).toBeTruthy();
    expect(screen.getByText('Running for')).toBeTruthy();
    expect(screen.getByRole('button', { name: '2nd attempt' })).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'awaiting 1 entry' }),
    ).toBeTruthy();
    expect(screen.queryByText('Backing-off')).toBeNull();
  });

  it('links scheduler-only retries to their transient errors', () => {
    renderCard(
      invocation(
        {
          vqueue_id: 'vq-example',
          stage: 'finished',
          status: 'finished',
          created_at: '2026-01-01T00:00:00.000Z',
          first_runnable_at: '2026-01-01T00:00:00.004Z',
          first_attempt_at: '2026-01-01T00:00:10.000Z',
          latest_attempt_at: '2026-01-01T00:00:55.000Z',
          transitioned_at: '2026-01-01T00:00:58.000Z',
          retry_attempts: 0,
          num_attempts: 3,
          num_errors: 3,
        },
        {
          status: 'killed',
          completed_at: '2026-01-01T00:00:58.000Z',
        },
      ),
      undefined,
      [
        {
          category: 'event',
          type: 'Event: TransientError',
          index: 9,
          start: '2026-01-01T00:00:55.000Z',
          message: 'Database unavailable',
        },
      ],
    );

    expect(
      screen.getByText('1st attempt').parentElement?.textContent,
    ).not.toContain('transient error');
    expect(
      screen.getByText('3rd attempt').parentElement?.textContent,
    ).not.toContain('transient error');
    expect(screen.queryByText(/intermediate attempt/)).toBeNull();
    expect(screen.getByText('Killed')).toBeTruthy();
    expect(
      screen.getByRole('listitem', {
        name: 'Retries: 3 retries',
      }),
    ).toBeTruthy();

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Retries: 3',
      }),
    );
    expect(screen.getByText('Transient errors')).toBeTruthy();
    expect(screen.getByText('Database unavailable')).toBeTruthy();
  });

  it('caps activity histories and shows journal context for pauses and suspensions', () => {
    const command: JournalEntryV2 = {
      category: 'command',
      type: 'Sleep',
      index: 3,
      commandIndex: 0,
      completionId: 7,
      name: 'waiting for dependency',
      wakeupAt: '2026-01-01T00:02:00.000Z',
    };
    const secondCommand: JournalEntryV2 = {
      category: 'command',
      type: 'Sleep',
      index: 4,
      commandIndex: 1,
      completionId: 8,
      name: 'waiting for signal',
      wakeupAt: '2026-01-01T00:03:00.000Z',
    };
    const transientErrors: JournalEntryV2[] = Array.from(
      { length: 12 },
      (_, index) => ({
        category: 'event',
        type: 'Event: TransientError',
        index: 20 + index,
        start: `2026-01-01T00:00:${String(10 + index).padStart(2, '0')}.000Z`,
        message: `Transient error ${index + 1}`,
        relatedCommandIndex: 0,
      }),
    );
    const pauses: JournalEntryV2[] = Array.from({ length: 12 }, (_, index) => ({
      category: 'event',
      type: 'Paused',
      index: 40 + index,
      start: `2026-01-01T00:00:${String(25 + index).padStart(2, '0')}.000Z`,
      message: `Pause error ${index + 1}`,
      relatedCommandIndex: 0,
      afterJournalEntryIndex: 3,
      isPending: false,
    }));
    const suspensions: JournalEntryV2[] = Array.from(
      { length: 12 },
      (_, index) => ({
        category: 'event',
        type: 'Suspended',
        index: 60 + index,
        start: `2026-01-01T00:00:${String(40 + index).padStart(2, '0')}.000Z`,
        afterJournalEntryIndex: 3,
        awaitingOn: {
          AllCompleted: [
            { Single: { CompletionId: 7 } },
            { Single: { CompletionId: 8 } },
          ],
        },
        isPending: false,
      }),
    );

    renderCard(
      invocation(
        {
          vqueue_id: 'vq-example',
          stage: 'finished',
          status: 'finished',
          created_at: '2026-01-01T00:00:00.000Z',
          first_runnable_at: '2026-01-01T00:00:00.001Z',
          first_attempt_at: '2026-01-01T00:00:00.002Z',
          latest_attempt_at: '2026-01-01T00:00:55.000Z',
          retry_attempts: 10_000,
          num_attempts: 13,
          num_errors: 12,
        },
        { status: 'killed', completed_at: '2026-01-01T00:01:00.000Z' },
      ),
      snapshot({
        focusEntry: {
          id: 'inv-focus',
          stage: 'finished',
          status: 'killed',
          attempts: 13,
          errors: 12,
          pauses: 12,
          suspensions: 12,
          totalBlocks: [],
          latestBlocks: [],
        },
      }),
      [command, secondCommand, ...transientErrors, ...pauses, ...suspensions],
    );

    const retriesButton = screen.getByRole('button', {
      name: 'Retries: 10,000',
    });
    expect(screen.getByLabelText('Backoffs: 12').closest('button')).toBeNull();
    const pausesButton = screen.getByRole('button', { name: 'Pauses: 12' });
    const suspensionsButton = screen.getByRole('button', {
      name: 'Suspensions: 12',
    });

    fireEvent.click(retriesButton);
    expect(screen.getByText('Transient error 3')).toBeTruthy();
    expect(screen.getByText('Transient error 12')).toBeTruthy();
    expect(screen.queryByText('Transient error 2')).toBeNull();
    expect(screen.getAllByRole('button', { name: '#0' })).toHaveLength(10);
    expect(
      screen.getByText('Transient error 12').closest('[data-entry]')
        ?.textContent,
    ).toContain('at 39s ago');
    expect(
      screen.getByText('Showing the latest 10 of 12 transient-error events.'),
    ).toBeTruthy();
    fireEvent.click(retriesButton);

    fireEvent.click(pausesButton);
    expect(screen.getAllByText('Paused after', { exact: true })).toHaveLength(
      10,
    );
    expect(screen.getByText('Pause error 3')).toBeTruthy();
    expect(screen.getByText('Pause error 12')).toBeTruthy();
    expect(screen.queryByText('Pause error 2')).toBeNull();
    expect(screen.getAllByRole('button', { name: '#0' })).toHaveLength(10);
    expect(
      screen.getByText('Showing the latest 10 of 12 pauses.'),
    ).toBeTruthy();
    fireEvent.click(pausesButton);

    fireEvent.click(suspensionsButton);
    expect(screen.getAllByText('Suspended', { exact: true })).toHaveLength(10);
    const awaitedEntries = screen.getAllByRole('button', {
      name: /awaited 2 entries/,
    });
    expect(awaitedEntries).toHaveLength(10);
    fireEvent.click(awaitedEntries[0] as HTMLElement);
    expect(screen.getByText(/waiting for dependency/)).toBeTruthy();
    expect(screen.getByText(/waiting for signal/)).toBeTruthy();
    expect(
      screen.getByText('Showing the latest 10 of 12 suspensions.'),
    ).toBeTruthy();
  });

  it('falls back to retained journal activity while the VQueue snapshot loads', () => {
    renderCard(
      invocation(
        {
          vqueue_id: 'vq-example',
          stage: 'running',
          status: 'started',
          created_at: '2026-01-01T00:00:00.000Z',
          first_runnable_at: '2026-01-01T00:00:10.000Z',
          first_attempt_at: '2026-01-01T00:00:20.000Z',
          latest_attempt_at: '2026-01-01T00:00:20.000Z',
          retry_attempts: 2,
          num_attempts: 1,
        },
        { status: 'running' },
      ),
      undefined,
      [
        { type: 'Suspended', category: 'event', index: 7 },
        { type: 'Paused', category: 'event', index: 8 },
      ],
    );

    expect(screen.getByText('Attempt')).toBeTruthy();
    expect(screen.getByText('Running')).toBeTruthy();
    expect(screen.queryByRole('group', { name: '1 attempt' })).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Toggle 1 attempt' }),
    ).toBeNull();
    expect(screen.queryByText('Retries')).toBeNull();
    expect(screen.getByRole('button', { name: 'Pauses: 1' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Suspensions: 1' })).toBeTruthy();
  });

  it('does not repeat the active pause in the completed activity summary', () => {
    renderCard(
      invocation(
        {
          vqueue_id: 'vq-example',
          stage: 'paused',
          status: 'started',
          created_at: '2026-01-01T00:00:00.000Z',
          first_runnable_at: '2026-01-01T00:00:00.000Z',
          first_attempt_at: '2026-01-01T00:00:00.010Z',
          latest_attempt_at: '2026-01-01T00:00:00.010Z',
          transitioned_at: '2026-01-01T00:00:40.000Z',
          num_attempts: 1,
        },
        { status: 'paused' },
      ),
      snapshot({
        focusEntry: {
          id: 'inv-focus',
          stage: 'paused',
          status: 'started',
          attempts: 1,
          pauses: 1,
          transitionedAt: '2026-01-01T00:00:40.000Z',
          totalBlocks: [],
          latestBlocks: [],
        },
      }),
      undefined,
      (queryClient) => {
        const pausedErrorQuery = adminApi(
          'query',
          '/query/invocations/{invocationId}/paused-error',
          'get',
          {
            baseUrl: '',
            parameters: { path: { invocationId: 'inv-focus' } },
          },
        );
        queryClient.setQueryData(pausedErrorQuery.queryKey, {
          message: 'Database unavailable',
          relatedRestateErrorCode: '500',
        });
      },
    );

    expect(screen.getByText('Paused')).toBeTruthy();
    expect(screen.getByText('Paused').closest('.min-h-8')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'after…' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Pauses: 1' })).toBeNull();
  });

  it('shows only earlier suspensions while currently suspended', () => {
    renderCard(
      invocation(
        {
          vqueue_id: 'vq-example',
          stage: 'suspended',
          status: 'started',
          created_at: '2026-01-01T00:00:00.000Z',
          first_runnable_at: '2026-01-01T00:00:00.000Z',
          first_attempt_at: '2026-01-01T00:00:00.010Z',
          latest_attempt_at: '2026-01-01T00:00:00.010Z',
          transitioned_at: '2026-01-01T00:00:40.000Z',
          num_attempts: 1,
        },
        {
          status: 'suspended',
          suspended_waiting_future_json: {
            AllCompleted: [
              { Single: { CompletionId: 1 } },
              { Single: { SignalName: 'approved' } },
            ],
          },
        },
      ),
      snapshot({
        focusEntry: {
          id: 'inv-focus',
          stage: 'suspended',
          status: 'started',
          attempts: 1,
          suspensions: 3,
          transitionedAt: '2026-01-01T00:00:40.000Z',
          totalBlocks: [],
          latestBlocks: [],
        },
      }),
    );

    expect(screen.getByText('Suspended')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'awaiting 2 entries' }),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Suspensions: 2' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Suspensions: 3' })).toBeNull();
  });

  it('does not repeat the active yield in the completed activity summary', () => {
    renderCard(
      invocation(
        {
          vqueue_id: 'vq-example',
          stage: 'inbox',
          status: 'yielded',
          created_at: '2026-01-01T00:00:00.000Z',
          first_runnable_at: '2026-01-01T00:00:00.000Z',
          first_attempt_at: '2026-01-01T00:00:00.010Z',
          latest_attempt_at: '2026-01-01T00:00:00.010Z',
          transitioned_at: '2026-01-01T00:00:40.000Z',
          num_attempts: 1,
        },
        { status: 'yielded' },
      ),
      snapshot({
        counts: {
          inbox: 1,
          running: 0,
          suspended: 0,
          paused: 0,
          finished: 0,
        },
        focusEntry: {
          id: 'inv-focus',
          stage: 'inbox',
          status: 'yielded',
          position: 1,
          attempts: 1,
          yields: 1,
          transitionedAt: '2026-01-01T00:00:40.000Z',
          totalBlocks: [],
          latestBlocks: [],
        },
      }),
    );

    expect(screen.getByText('Yielded')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Yields: 1' })).toBeNull();
    expect(screen.queryByText(/entries/)).toBeNull();
    expect(screen.queryByText(/in queue/)).toBeNull();
  });

  it('keeps completed journeys fixed and ignores the current queue head blocker', () => {
    renderCard(
      invocation(
        {
          vqueue_id: 'vq-example',
          stage: 'finished',
          status: 'succeeded',
          created_at: '2026-01-01T00:00:00.000Z',
          first_runnable_at: '2026-01-01T00:00:00.000Z',
          first_attempt_at: '2026-01-01T00:00:00.010Z',
          latest_attempt_at: '2026-01-01T00:00:00.010Z',
          transitioned_at: '2026-01-01T00:00:30.000Z',
          num_attempts: 1,
        },
        {
          status: 'succeeded',
          completed_at: '2026-01-01T00:00:30.000Z',
        },
      ),
      snapshot({
        status: {
          blocked: true,
          scheduling: 'blocked',
          blockedOn: 'concurrency_rules',
        },
        stageAvg: { endToEnd: 'PT30S' },
        head: {
          entryId: 'inv-focus',
          stage: 'inbox',
          status: 'new',
          totalBlocks: [],
          nowBlocks: [{ gate: 'concurrency_rules', duration: 'PT18S' }],
          avgBlocks: [{ gate: 'concurrency_rules', duration: 'PT6S' }],
        },
      }),
    );

    expect(
      screen.getByRole('heading', { name: 'Lifecycle' }).parentElement
        ?.textContent,
    ).toContain('completed in 30s');
    expect(
      screen.getByRole('heading', { name: 'Lifecycle' }).parentElement
        ?.textContent,
    ).not.toContain('so far');
    expect(screen.getByText('Attempt')).toBeTruthy();
    expect(screen.getByText('Succeeded')).toBeTruthy();
    expect(screen.getByText('Succeeded').parentElement?.textContent).toContain(
      'at 00:00:30',
    );
    expect(screen.getByText('Lasted').parentElement?.textContent).toContain(
      '29.99s',
    );
    expect(screen.queryByText('Blocked')).toBeNull();
  });

  it('uses completed node timestamps and phase durations that sum to the journey', () => {
    renderCard(
      invocation(
        {
          vqueue_id: 'vq-example',
          stage: 'finished',
          status: 'succeeded',
          created_at: '2026-01-01T00:00:00.000Z',
          first_runnable_at: '2026-01-01T00:00:05.000Z',
          first_attempt_at: '2026-01-01T00:00:10.000Z',
          latest_attempt_at: '2026-01-01T00:00:10.000Z',
          transitioned_at: '2026-01-01T00:00:30.000Z',
          num_attempts: 1,
        },
        {
          status: 'succeeded',
          completed_at: '2026-01-01T00:00:30.000Z',
        },
      ),
      snapshot({ stageAvg: { queue: 'PT5S', endToEnd: 'PT30S' } }),
    );

    expect(screen.getByText('Created').parentElement?.textContent).toContain(
      'Jan 1 at 00:00:00',
    );
    expect(screen.queryByText('Scheduled for')).toBeNull();
    expect(screen.getByText('Became runnable').parentElement?.textContent).toBe(
      'Became runnable after 5s',
    );
    expect(screen.getByText('Queued').parentElement?.textContent).toContain(
      '5s',
    );
    expect(screen.getByText('Attempt').parentElement?.textContent).toContain(
      'AttemptLasted20s',
    );
    expect(screen.getByText('Succeeded').parentElement?.textContent).toContain(
      'at 00:00:30',
    );
  });

  it('includes the date on both terminal anchors when the journey crosses a day', () => {
    renderCard(
      invocation(
        {
          vqueue_id: 'vq-example',
          stage: 'finished',
          status: 'succeeded',
          created_at: '2025-12-31T23:59:50.000Z',
          first_runnable_at: '2025-12-31T23:59:50.000Z',
          first_attempt_at: '2025-12-31T23:59:55.000Z',
          latest_attempt_at: '2025-12-31T23:59:55.000Z',
          transitioned_at: '2026-01-01T00:00:30.000Z',
          num_attempts: 1,
        },
        {
          status: 'succeeded',
          created_at: '2025-12-31T23:59:50.000Z',
          completed_at: '2026-01-01T00:00:30.000Z',
        },
      ),
    );

    expect(screen.getByText('Created').parentElement?.textContent).toContain(
      'Dec 31, 2025 at 23:59:50',
    );
    expect(screen.getByText('Succeeded').parentElement?.textContent).toContain(
      'Jan 1 at 00:00:30',
    );
  });

  it.each([
    ['succeeded', 'Succeeded'],
    ['failed', 'Failed'],
    ['cancelled', 'Cancelled'],
    ['killed', 'Killed'],
  ] as const)(
    'renders %s as the final journey milestone',
    (status, expectedLabel) => {
      renderCard(
        invocation(
          {
            vqueue_id: 'vq-example',
            stage: 'finished',
            status,
            created_at: '2026-01-01T00:00:00.000Z',
            first_runnable_at: '2026-01-01T00:00:00.000Z',
            first_attempt_at: '2026-01-01T00:00:00.010Z',
            latest_attempt_at: '2026-01-01T00:00:20.000Z',
            transitioned_at: '2026-01-01T00:00:30.000Z',
            num_attempts: 2,
          },
          {
            status,
            completed_at: '2026-01-01T00:00:30.000Z',
            completion_retention: 'PT24H',
          },
        ),
      );

      const latestAttempt = screen.getByText('2nd attempt');
      const terminalStatus = screen.getByText(expectedLabel);
      const purgeStatus = screen.getByText('Will be purged from storage');
      const terminalConnector = terminalStatus
        .closest('.min-h-8')
        ?.querySelector('span.absolute');
      const purgeConnector = purgeStatus
        .closest('.min-h-8')
        ?.querySelector('span.absolute');

      expect(terminalStatus.closest('.min-h-8')).toBeTruthy();
      expect(purgeStatus.closest('.min-h-8')).toBeTruthy();
      expect(terminalConnector?.className).toContain('top-0');
      expect(terminalConnector?.className).toContain(
        'bottom-[calc(50%+0.375rem)]',
      );
      expect(terminalConnector?.className).not.toContain('-z-10');
      expect(purgeConnector?.className).toContain('-top-2.5');
      expect(purgeConnector?.className).toContain(
        'bottom-[calc(50%+0.375rem)]',
      );
      expect(
        latestAttempt.compareDocumentPosition(terminalStatus) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(terminalStatus.parentElement?.textContent).toContain('00:00:30');
      expect(
        terminalStatus.compareDocumentPosition(purgeStatus) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(purgeStatus.parentElement?.textContent).toContain('in 23h 59m');
      expect(
        purgeStatus.parentElement?.parentElement?.nextElementSibling,
      ).toBeNull();
    },
  );
});
