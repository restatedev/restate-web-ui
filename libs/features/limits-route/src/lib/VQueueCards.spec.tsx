import type { VqueueSnapshot } from '@restate/data-access/admin-api-spec';
import { SnapshotTimeProvider } from '@restate/util/snapshot-time';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { VQueueActivityCard, VQueueDurationsCard } from './VQueueCards';

function snapshot(overrides: Partial<VqueueSnapshot> = {}): VqueueSnapshot {
  return {
    identity: {
      service: 'ExampleService',
      isPaused: false,
      vqueueId: 'vq-example',
    },
    status: { blocked: false },
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

afterEach(() => {
  vi.useRealTimers();
});

describe('VQueueDurationsCard', () => {
  it('shows duration bars and a stacked scheduler-block breakdown', async () => {
    vi.useFakeTimers();
    render(
      <VQueueDurationsCard
        data={snapshot({
          stageAvg: {
            endToEnd: 'PT10S',
            queue: 'PT8S',
            inbox: 'PT7S',
            running: 'PT2S',
            suspended: 'PT0S',
          },
          head: {
            totalBlocks: [],
            nowBlocks: [],
            avgBlocks: [
              { gate: 'concurrency_rules', duration: 'PT4S' },
              { gate: 'throttling_rules', duration: 'PT2S' },
            ],
          },
        })}
      />,
    );

    expect(screen.getByText('Timing')).toBeTruthy();
    expect(
      screen.getByRole('button', {
        name: 'Explain how timings are averaged',
      }),
    ).toBeTruthy();
    expect(screen.getByText('End to end')).toBeTruthy();
    expect(screen.getByText('Completed entries')).toBeTruthy();
    expect(screen.queryByText('Exponential moving average')).toBeNull();
    expect(screen.getByText('10s')).toBeTruthy();
    expect(screen.getByText('Inbox')).toBeTruthy();
    expect(screen.getByText('Queue')).toBeTruthy();
    expect(screen.getByText('Blocked')).toBeTruthy();
    expect(screen.getByText('8s')).toBeTruthy();

    const orderedRows = [
      screen.getByText('Inbox'),
      screen.getByText('Queue'),
      screen.getByText('Blocked'),
      screen.getByText('Running'),
      screen.getByText('Suspended'),
    ];
    orderedRows.slice(1).forEach((row, index) => {
      expect(
        orderedRows[index]!.compareDocumentPosition(row) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });

    const blockBar = screen.getByRole('img', {
      name: 'Blocked: Concurrency rule 4s, Throttling rule 2s, total 6s',
    });
    fireEvent.mouseEnter(blockBar.parentElement!);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(251);
    });

    const tooltipText = screen.getByRole('tooltip').textContent;
    expect(tooltipText).toContain('Blocked');
    expect(tooltipText).toContain('6sper dispatch attempt');
    expect(tooltipText).toContain('Concurrency rule4s(67%)');
    expect(tooltipText).toContain('Throttling rule2s(33%)');
  });
});

describe('VQueueActivityCard', () => {
  it('renders queue activity chronologically from creation', () => {
    render(
      <SnapshotTimeProvider
        lastSnapshot={Date.parse('2026-08-16T16:00:10.000Z')}
      >
        <VQueueActivityCard
          data={snapshot({
            events: {
              createdAt: '2026-08-16T15:59:00.000Z',
              enqueuedAt: '2026-08-16T16:00:04.000Z',
              startAt: '2026-08-16T16:00:05.000Z',
              attemptAt: '2026-08-16T16:00:08.000Z',
              finishAt: '2026-08-16T16:00:02.000Z',
            },
          })}
        />
      </SnapshotTimeProvider>,
    );

    expect(screen.getByText('Recent activities')).toBeTruthy();
    expect(screen.queryByText('Latest event')).toBeNull();
    expect(
      screen.getAllByRole('listitem').map((item) => item.textContent),
    ).toEqual([
      'Created1m 10s ago',
      'Last finish was8s ago',
      'Last enqueue was6s ago',
      'Last start was5s ago',
      'Last attempt was2s ago',
    ]);
    expect(screen.getByText('1m 10s ago').className).toContain('text-sm');
    expect(screen.getByText('8s ago').className).toContain('text-xs');
  });
});
