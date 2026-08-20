import type { Invocation } from '@restate/data-access/admin-api-spec';
import { SnapshotTimeProvider } from '@restate/util/snapshot-time';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import {
  WorkflowRunCard,
  WorkflowRunUnavailableBanner,
} from './WorkflowRunCard';

const invocation: Invocation = {
  id: 'inv-workflow-run',
  created_at: '2026-08-20T09:00:00.000Z',
  modified_at: '2026-08-20T09:00:02.000Z',
  scheduled_at: '2026-08-20T09:00:00.000Z',
  completed_at: '2026-08-20T09:00:02.000Z',
  invoked_by: 'ingress',
  status: 'succeeded',
  target: 'OrderWorkflow/run',
  target_handler_name: 'run',
  target_service_name: 'OrderWorkflow',
  target_service_key: 'order-1',
  target_service_ty: 'workflow',
};

describe('WorkflowRunCard', () => {
  it('shows execution duration instead of a completed timestamp', () => {
    render(
      <MemoryRouter>
        <SnapshotTimeProvider
          lastSnapshot={Date.parse('2026-08-20T09:00:03.000Z')}
        >
          <WorkflowRunCard
            invocation={invocation}
            stats={{
              supported: true,
              duration: 'PT1.528S',
              pendingPromiseCount: 0,
            }}
          />
        </SnapshotTimeProvider>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'Execution' })).toBeTruthy();
    const invocationLink = screen.getByRole('link', {
      name: 'Open invocation inv-workflow-run',
    });
    expect(invocationLink.textContent).toContain('took 1.528s');
    expect(invocationLink.textContent).not.toContain('Duration');
    const timing = invocationLink.querySelector('[data-card-link-end-content]');
    expect(timing?.previousElementSibling?.className).toContain('flex-auto');
    expect(timing?.nextElementSibling?.classList).toContain(
      'lucide-chevron-right',
    );
    expect(screen.queryByText('Completed')).toBeNull();
    expect(screen.getByText('Created').closest('a')).toBeNull();
  });

  it('describes elapsed time for an incomplete execution', () => {
    render(
      <MemoryRouter>
        <WorkflowRunCard
          invocation={{ ...invocation, completed_at: undefined }}
          stats={{
            supported: true,
            duration: 'PT1.528S',
            pendingPromiseCount: 0,
          }}
        />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('link', {
        name: 'Open invocation inv-workflow-run',
      }).textContent,
    ).toContain('processing for 1.528s');
  });
});

describe('WorkflowRunUnavailableBanner', () => {
  it('renders a full-width retention explanation', () => {
    render(<WorkflowRunUnavailableBanner />);

    const banner = screen.getByRole('status');
    expect(banner.getAttribute('class')).toContain('mx-5');
    expect(screen.getByText('Run invocation not found')).toBeTruthy();
    expect(
      screen.getByText(
        'It may have been removed after its retention period elapsed.',
      ),
    ).toBeTruthy();
  });
});
