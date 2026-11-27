import type { JournalEntryV2 } from '@restate/data-access-admin-api-spec';
import { describe, expect, it } from 'vitest';
import {
  drawsSendTrail,
  getChildTooltipEntry,
  getSendChildSummary,
  getSendInvocationId,
  getSendLabel,
  getSendStatusLabel,
  getSendTone,
  getSendTrailLayout,
  type SendChildSummary,
  type SendTrailLayout,
} from './sendChild';

const at = (seconds: number) =>
  new Date(Date.UTC(2026, 0, 1, 0, 0, seconds)).toISOString();
const ms = (seconds: number) => new Date(at(seconds)).getTime();
const now = ms(600);

const send = (fields: Partial<JournalEntryV2> = {}) =>
  ({
    category: 'command',
    type: 'OneWayCall',
    invocationId: 'inv_child',
    start: at(10),
    ...fields,
  }) as JournalEntryV2;

describe('getSendChildSummary', () => {
  it('needs a status and a creation time', () => {
    expect(getSendChildSummary(undefined, now)).toBeUndefined();
    expect(getSendChildSummary({ status: 'running' }, now)).toBeUndefined();
  });

  it('ends a finished child at its completion and times it from its first run', () => {
    expect(
      getSendChildSummary(
        {
          status: 'succeeded',
          createdAt: at(0),
          runningAt: at(60),
          completedAt: at(62),
        },
        now,
      ),
    ).toEqual({
      status: 'succeeded',
      createdAt: ms(0),
      runningAt: ms(60),
      endAt: ms(62),
      isOpen: false,
      label: '2s',
    });
  });

  it('closes a finished child even without a completion time', () => {
    expect(
      getSendChildSummary(
        { status: 'failed', createdAt: at(0), runningAt: at(1) },
        now,
      ),
    ).toMatchObject({ endAt: ms(1), isOpen: false, label: '' });
  });

  it('keeps a child that has not finished open and times it until now', () => {
    expect(
      getSendChildSummary(
        { status: 'suspended', createdAt: at(0), runningAt: at(0) },
        now,
      ),
    ).toEqual({
      status: 'suspended',
      createdAt: ms(0),
      runningAt: ms(0),
      isOpen: true,
      label: '10m',
    });
  });

  it('ends a scheduled child at its start and says when it starts', () => {
    expect(
      getSendChildSummary(
        { status: 'scheduled', createdAt: at(0), scheduledStartAt: at(900) },
        now,
      ),
    ).toMatchObject({ endAt: ms(900), isOpen: true, label: 'in 5m' });
  });

  it('times a finished child from its creation when it never reported a first run', () => {
    expect(
      getSendChildSummary(
        { status: 'killed', createdAt: at(0), completedAt: at(3) },
        now,
      ),
    ).toMatchObject({ endAt: ms(3), isOpen: false, label: '3s' });
  });

  it('keeps a scheduled child open without a start time', () => {
    expect(
      getSendChildSummary({ status: 'scheduled', createdAt: at(0) }, now),
    ).toMatchObject({ endAt: undefined, isOpen: true, label: '' });
  });

  it("falls back to the send's invoke time for a scheduled child", () => {
    expect(
      getSendChildSummary(
        { status: 'scheduled', createdAt: at(0) },
        now,
        at(720),
      ),
    ).toMatchObject({ endAt: ms(720), label: 'in 2m' });
  });

  it('drops the countdown once the scheduled start has passed', () => {
    expect(
      getSendChildSummary(
        { status: 'scheduled', createdAt: at(0), scheduledStartAt: at(300) },
        now,
      ),
    ).toMatchObject({ endAt: ms(300), label: '' });
  });
});

describe('getSendTrailLayout', () => {
  const layout = (
    summary: Omit<SendChildSummary, 'status'>,
    options: Partial<Parameters<typeof getSendTrailLayout>[0]> = {},
  ) =>
    getSendTrailLayout({
      sendAt: ms(10),
      summary: { status: summary.isOpen ? 'running' : 'succeeded', ...summary },
      rangeEnd: ms(20),
      nowMs: now,
      viewportStart: ms(0),
      viewportEnd: ms(20),
      ...options,
    });

  it('ends a child that finished inside the range with a point and its duration', () => {
    expect(
      layout({
        createdAt: ms(10),
        runningAt: ms(11),
        endAt: ms(12),
        isOpen: false,
        label: '1s',
      }),
    ).toEqual({
      lineEnd: ms(12),
      runAt: ms(11),
      continuesPastEnd: false,
      labelSide: 'after',
      withStatus: false,
      fadeWait: false,
    });
  });

  it('lets a child that finished after the range continue past the edge', () => {
    expect(
      layout({
        createdAt: ms(10),
        runningAt: ms(10),
        endAt: ms(90),
        isOpen: false,
        label: '80s',
      }),
    ).toMatchObject({
      lineEnd: ms(20),
      continuesPastEnd: true,
      labelSide: 'below',
      withStatus: true,
    });
  });

  it('stops a running child at now while live', () => {
    expect(
      layout(
        { createdAt: ms(10), runningAt: ms(10), isOpen: true, label: '5s' },
        { nowMs: ms(15), rangeEnd: ms(16) },
      ),
    ).toMatchObject({ lineEnd: ms(15), continuesPastEnd: true });
  });

  it('keeps a running child open even when now is inside the range', () => {
    expect(
      layout(
        { createdAt: ms(10), runningAt: ms(10), isOpen: true, label: '5s' },
        { nowMs: ms(15) },
      ),
    ).toMatchObject({ lineEnd: ms(15), continuesPastEnd: true });
  });

  it('starts the line at the send even when the child was created later', () => {
    expect(
      layout({
        createdAt: ms(12),
        runningAt: ms(13),
        endAt: ms(14),
        isOpen: false,
        label: '1s',
      }),
    ).toMatchObject({ runAt: ms(13), lineEnd: ms(14) });
  });

  it('fades the waiting part when the child starts after the range', () => {
    expect(
      layout({
        createdAt: ms(10),
        runningAt: ms(70),
        endAt: ms(71),
        isOpen: false,
        label: '1s',
      }),
    ).toMatchObject({ runAt: ms(20), fadeWait: true, continuesPastEnd: true });
  });

  it('puts the label below when the end is near the right of the visible window', () => {
    expect(
      layout(
        {
          createdAt: ms(10),
          runningAt: ms(10),
          endAt: ms(12),
          isOpen: false,
          label: '2s',
        },
        { viewportStart: ms(5), viewportEnd: ms(13) },
      ),
    ).toMatchObject({ labelSide: 'below', withStatus: false });
  });

  it('never ends a line before its send', () => {
    expect(
      layout({
        createdAt: ms(9.5),
        runningAt: ms(9.5),
        endAt: ms(9.8),
        isOpen: false,
        label: '300ms',
      }),
    ).toMatchObject({ lineEnd: ms(10), runAt: ms(10) });
  });

  it('never ends an open line before the child started running', () => {
    expect(
      layout(
        { createdAt: ms(10), runningAt: ms(15), isOpen: true, label: '0ms' },
        { nowMs: ms(14) },
      ),
    ).toMatchObject({ lineEnd: ms(15), runAt: ms(15) });
  });

  it('draws no line for a child that existed before the send', () => {
    expect(
      layout({
        createdAt: ms(2),
        runningAt: ms(2),
        endAt: ms(3),
        isOpen: false,
        label: '1s',
      }),
    ).toBeUndefined();
  });
});

describe('drawsSendTrail', () => {
  it('draws for a send with a child invocation', () => {
    expect(drawsSendTrail(send(), undefined, undefined)).toBe(true);
    expect(getSendInvocationId(send())).toBe('inv_child');
  });

  it('keeps the regular look for sends that are not plain', () => {
    expect(
      drawsSendTrail(send({ invocationId: undefined }), undefined, undefined),
    ).toBe(false);
    expect(
      drawsSendTrail(send({ isRetrying: true }), undefined, undefined),
    ).toBe(false);
    expect(
      drawsSendTrail(send(), undefined, [
        { category: 'event', type: 'Event: TransientError' } as JournalEntryV2,
      ]),
    ).toBe(false);
    expect(
      drawsSendTrail(
        send(),
        { invoked_by: 'restart_as_new', created_at: at(20) },
        undefined,
      ),
    ).toBe(false);
  });

  it('draws for a send made after a restart', () => {
    expect(
      drawsSendTrail(
        send(),
        { invoked_by: 'restart_as_new', created_at: at(5) },
        undefined,
      ),
    ).toBe(true);
  });
});

describe('getSendTone', () => {
  it('colors only statuses that carry meaning', () => {
    expect(getSendTone('succeeded')).toBe('success');
    expect(getSendTone('failed')).toBe('danger');
    expect(getSendTone('running')).toBe('info');
    expect(getSendTone('backing-off')).toBe('warning');
    expect(getSendTone('paused')).toBe('warning');
    expect(getSendTone('new')).toBe('pending');
    expect(getSendTone('ready')).toBe('pending');
    expect(getSendTone('yielded')).toBe('pending');
    expect(getSendTone('suspended')).toBe('neutral');
    expect(getSendTone('scheduled')).toBe('neutral');
    expect(getSendTone('cancelled')).toBe('neutral');
    expect(getSendTone('killed')).toBe('neutral');
    expect(getSendTone(undefined)).toBe('neutral');
  });
});

describe('getSendLabel', () => {
  const summary: SendChildSummary = {
    status: 'backing-off',
    createdAt: ms(0),
    isOpen: true,
    label: '2m',
  };
  const layout = (withStatus: boolean) => ({ withStatus }) as SendTrailLayout;

  it('shows only the duration when the end point is visible', () => {
    expect(getSendLabel(summary, layout(false))).toBe('2m');
  });

  it('adds the status when the line continues', () => {
    expect(getSendLabel(summary, layout(true))).toBe('backing off · 2m');
    expect(getSendLabel({ ...summary, label: '' }, layout(true))).toBe(
      'backing off',
    );
  });

  it('falls back to the raw status for unknown ones', () => {
    expect(getSendStatusLabel('unknown' as 'running')).toBe('unknown');
  });
});

describe('getChildTooltipEntry', () => {
  it('keeps the send entry when the child is unknown', () => {
    expect(getChildTooltipEntry(send(), undefined, now)).toEqual(send());
  });

  it("shows a finished child's run as a range", () => {
    expect(
      getChildTooltipEntry(
        send(),
        {
          status: 'succeeded',
          createdAt: ms(10),
          runningAt: ms(11),
          endAt: ms(13),
          isOpen: false,
          label: '2s',
        },
        now,
      ),
    ).toMatchObject({ start: at(11), end: at(13), isPending: false });
  });

  it('runs an open child until now', () => {
    expect(
      getChildTooltipEntry(
        send(),
        {
          status: 'running',
          createdAt: ms(10),
          runningAt: ms(11),
          isOpen: true,
          label: '9m',
        },
        now,
      ),
    ).toMatchObject({ start: at(11), end: at(600) });
  });

  it('never ends before the child started when now lags behind', () => {
    expect(
      getChildTooltipEntry(
        send(),
        {
          status: 'running',
          createdAt: ms(10),
          runningAt: ms(700),
          isOpen: true,
          label: '0ms',
        },
        now,
      ),
    ).toMatchObject({ start: at(700), end: at(700) });
  });

  it('shows when a scheduled child starts', () => {
    expect(
      getChildTooltipEntry(
        send(),
        {
          status: 'scheduled',
          createdAt: ms(10),
          endAt: ms(900),
          isOpen: true,
          label: 'in 5m',
        },
        now,
      ),
    ).toMatchObject({ start: at(900), end: undefined });
  });
});
