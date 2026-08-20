import type { Invocation } from '@restate/data-access/admin-api-spec';
import { SnapshotTimeProvider } from '@restate/util/snapshot-time';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
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

function TestProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe('WorkflowRunCard', () => {
  it('shows the invocation status beside the invocation ID', () => {
    render(
      <TestProviders>
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
      </TestProviders>,
    );

    expect(screen.getByRole('heading', { name: 'Execution' })).toBeTruthy();
    const invocationLink = screen.getByRole('link', {
      name: 'Open invocation inv-workflow-run',
    });
    expect(invocationLink.textContent).toContain('Succeeded');
    expect(invocationLink.textContent).not.toContain('1.528s');
    expect(screen.queryByText('Completed')).toBeNull();
    expect(screen.getByText('Created').closest('a')).toBeNull();
  });

  it('shows the active invocation status', () => {
    render(
      <TestProviders>
        <WorkflowRunCard
          invocation={{
            ...invocation,
            completed_at: undefined,
            status: 'running',
          }}
          stats={{
            supported: true,
            duration: 'PT1.528S',
            pendingPromiseCount: 0,
          }}
        />
      </TestProviders>,
    );

    const invocationLink = screen.getByRole('link', {
      name: 'Open invocation inv-workflow-run',
    });
    expect(invocationLink.textContent).toContain('Running');
    expect(invocationLink.textContent).not.toContain('1.528s');
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
