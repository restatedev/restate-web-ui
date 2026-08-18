import type { VqueueSnapshot } from '@restate/data-access/admin-api-spec';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { VQueueId } from './VQueueId';

const useGetVqueue = vi.hoisted(() => vi.fn());

const snapshot: VqueueSnapshot = {
  identity: {
    service: 'ExampleService',
    isPaused: false,
    vqueueId: 'vq_snapshot',
  },
  status: {
    blocked: false,
  },
  counts: {
    inbox: 1,
    running: 0,
    suspended: 0,
    paused: 0,
    finished: 0,
  },
  stageAvg: {},
  events: {},
  head: {
    entryId: 'inv_snapshot',
    stage: 'inbox',
    status: 'new',
    totalBlocks: [],
    nowBlocks: [],
    avgBlocks: [],
  },
  focusEntry: {
    id: 'inv_snapshot',
    stage: 'inbox',
    status: 'new',
    position: 1,
    totalBlocks: [],
    latestBlocks: [],
  },
};

vi.mock('@restate/data-access/admin-api-hooks', () => ({
  useGetVqueue,
}));

describe('VQueueId', () => {
  it('shows a navigation chevron when rendered as a link', () => {
    render(
      <MemoryRouter>
        <VQueueId id="vq_link" popover={false} />
      </MemoryRouter>,
    );

    const link = screen.getByRole('link', {
      name: 'Open VQueue vq_link',
    });

    expect(link.getAttribute('href')).toBe('/flow-control/vqueues/vq_link');
    expect(link.querySelectorAll('svg')).toHaveLength(2);
  });

  it('keeps the VQueue identity visible in a left-aligned loading state', async () => {
    useGetVqueue.mockReturnValue({
      data: undefined,
      error: undefined,
      isFetching: true,
    });

    render(<VQueueId id="vq_loading" />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Open VQueue vq_loading' }),
    );

    const status = await screen.findByRole('status');

    expect(status.textContent).toBe('Loading VQueue…');
    expect(status.getAttribute('class')).toContain('justify-start');
    expect(screen.getAllByText('vq_loading')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Copy' })).toBeTruthy();
  });

  it('uses a supplied snapshot without starting a second VQueue read', async () => {
    useGetVqueue.mockReturnValue({
      data: undefined,
      error: undefined,
      isFetching: false,
    });

    render(
      <MemoryRouter>
        <VQueueId
          id="vq_snapshot"
          focusEntryId="inv_snapshot"
          snapshot={snapshot}
        />
      </MemoryRouter>,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Open VQueue vq_snapshot' }),
    );

    expect(
      await screen.findByRole('list', { name: 'Entry stages' }),
    ).toBeTruthy();
    expect(useGetVqueue).toHaveBeenLastCalledWith(
      'vq_snapshot',
      'inv_snapshot',
      {
        enabled: false,
        staleTime: 0,
      },
    );
  });

  it('opens structured blocking details inside the VQueue popover', async () => {
    useGetVqueue.mockReturnValue({
      data: undefined,
      error: undefined,
      isFetching: false,
    });

    render(
      <MemoryRouter>
        <VQueueId
          id="vq_snapshot"
          snapshot={{
            ...snapshot,
            status: {
              blocked: true,
              scheduling: 'blocked',
              blockedOn: 'concurrency_rules',
              blockedResource: {
                resource: 'limit-key-concurrency',
                scope: 'tenant-a',
                limitKey: 'payments/priority',
                blockedLevel: 'level2',
                blockedRule: 'tenant-*/payments/priority',
              },
            },
            head: {
              ...snapshot.head,
              nowBlocks: [{ gate: 'concurrency_rules', duration: 'PT1.874S' }],
            },
          }}
        />
      </MemoryRouter>,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Open VQueue vq_snapshot' }),
    );
    fireEvent.click(
      await screen.findByRole('button', { name: /on concurrency rule/i }),
    );

    expect(await screen.findByText('concurrency limit')).toBeTruthy();
    expect(screen.getByText('1.874s')).toBeTruthy();
    expect(screen.getByText('is at its limit')).toBeTruthy();
    expect(screen.getByText('limit set by')).toBeTruthy();
    expect(
      screen
        .getByRole('link', {
          name: 'Limit counter tenant-a/payments/priority',
        })
        .getAttribute('href'),
    ).toContain('/flow-control/counters?');
    const ruleHref = screen
      .getByRole('link', {
        name: 'Limit rule tenant-*/payments/priority',
      })
      .getAttribute('href');
    const ruleFilter = new URL(
      String(ruleHref),
      'https://example.test',
    ).searchParams.get('filter_pattern');

    expect(JSON.parse(String(ruleFilter))).toEqual({
      operation: 'EQUALS',
      value: 'tenant-*/payments/priority',
    });
  });
});
