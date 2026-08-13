import type { VqueueSnapshot } from '@restate/data-access/admin-api-spec';
import { fireEvent, render, screen } from '@testing-library/react';
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
      <VQueueId
        id="vq_snapshot"
        focusEntryId="inv_snapshot"
        snapshot={snapshot}
      />,
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
});
