import { fireEvent, render, screen } from '@testing-library/react';
import { SnapshotTimeProvider } from '@restate/util/snapshot-time';
import { MemoryRouter } from 'react-router';
import { BlockedStatus, type BlockedStatusProps } from './BlockedStatus';

function renderStatus(props: BlockedStatusProps) {
  return render(
    <MemoryRouter>
      <SnapshotTimeProvider lastSnapshot={Date.parse('2026-08-14T10:45:00Z')}>
        <BlockedStatus {...props} />
      </SnapshotTimeProvider>
    </MemoryRouter>,
  );
}

function openStatus(reason: string) {
  fireEvent.click(
    screen.getByRole('button', { name: new RegExp(reason, 'i') }),
  );
}

describe('BlockedStatus', () => {
  it('can render only the blocked state without its reason', () => {
    renderStatus({ reason: 'concurrency rule', showReason: false });

    const blocked = screen.getByText('Blocked');

    expect(blocked).toBeTruthy();
    expect(blocked.parentElement?.classList.contains('pr-0.5')).toBe(false);
    expect(screen.queryByText('on concurrency rule')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('explains an object lock and links to the Virtual Object', async () => {
    const onOpenChange = vi.fn();
    renderStatus({
      resource: {
        resource: 'lock',
        scope: 'production',
        lockName: 'BlockingObject/hot-object-0',
      },
      blockedDuration: 'PT1M42S',
      objectTarget: (
        <a href="/virtual-objects/BlockingObject/hot-object-0">
          BlockingObject / hot-object-0
        </a>
      ),
      lockHolderTarget: (
        <a href="/invocations/inv_lock_holder">inv_lock_holder</a>
      ),
      onOpenChange,
    });

    openStatus('object lock');

    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(await screen.findByText('Virtual Object lock')).toBeTruthy();
    expect(
      screen
        .getByRole('link', { name: 'BlockingObject / hot-object-0' })
        .getAttribute('href'),
    ).toBe('/virtual-objects/BlockingObject/hot-object-0');
    expect(screen.queryByText('Lock holder')).toBeNull();
    expect(screen.getByText('has lock on')).toBeTruthy();
    expect(screen.queryByText('Object')).toBeNull();
    expect(
      screen
        .getByRole('link', { name: 'inv_lock_holder' })
        .getAttribute('href'),
    ).toBe('/invocations/inv_lock_holder');
  });

  it('shows the concrete blocking counter and its rule', async () => {
    renderStatus({
      resource: {
        resource: 'limit-key-concurrency',
        scope: 'tenant-a',
        limitKey: 'payments/priority',
        blockedLevel: 'level2',
        blockedRule: 'tenant-*/payments/priority',
      },
      blockedDuration: 'PT37S',
      counterHref: '/flow-control/counters?counter=exact',
      ruleHref: '/flow-control/counters?rule=exact',
      ruleLimit: 10,
      counterUsage: 10,
    });

    openStatus('concurrency rule');

    expect(await screen.findByText('concurrency limit')).toBeTruthy();
    expect(screen.queryByText('Counter at capacity')).toBeNull();
    expect(screen.getByText('limit set by')).toBeTruthy();
    expect(screen.getByText('is at its limit')).toBeTruthy();
    expect(screen.getByText('with')).toBeTruthy();
    expect(screen.getByText('concurrency =')).toBeTruthy();
    expect(screen.getByText('10')).toBeTruthy();
    expect(
      screen
        .getByRole('link', {
          name: 'Limit counter tenant-a/payments/priority',
        })
        .getAttribute('href'),
    ).toBe('/flow-control/counters?counter=exact');
    expect(
      screen
        .getByRole('link', {
          name: 'Limit rule tenant-*/payments/priority',
        })
        .getAttribute('href'),
    ).toBe('/flow-control/counters?rule=exact');
    expect(
      screen
        .getByRole('link', {
          name: 'Limit counter tenant-a/payments/priority',
        })
        .querySelector('svg')
        ?.getAttribute('class'),
    ).toContain('animate-gaugePressure');
  });

  it.each([
    ['invoker concurrency', 'invoker-concurrency'],
    ['invoker memory', 'invoker-memory'],
    ['deployment concurrency', 'deployment-concurrency'],
  ] as const)('renders %s as a static reason chip', (reason, resource) => {
    renderStatus({ resource: { resource }, blockedDuration: 'PT8S' });

    expect(screen.getByText(`on ${reason}`)).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('shows the estimated retry for invoker throttling', async () => {
    renderStatus({
      resource: {
        resource: 'invoker-throttling',
        estimatedRetryAt: '2026-08-14T10:48:24.000Z',
      },
      blockedDuration: 'PT4.2S',
    });

    openStatus('invoker throttling');

    expect(await screen.findByText('4.2s')).toBeTruthy();
    expect(screen.getByText('Estimated retry')).toBeTruthy();
    expect(screen.getByText('in 3m 24s')).toBeTruthy();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('renders invoker throttling as static without a retry estimate', () => {
    renderStatus({ resource: { resource: 'invoker-throttling' } });

    expect(screen.getByText('on invoker throttling')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('keeps the legacy reason and details fallback', async () => {
    renderStatus({
      reason: 'legacy resource',
      details: <span>Legacy server details</span>,
    });

    openStatus('legacy resource');

    expect(await screen.findByText('Legacy server details')).toBeTruthy();
  });
});
