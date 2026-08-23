import { adminApi } from '@restate/data-access/admin-api';
import type {
  components,
  Invocation,
} from '@restate/data-access/admin-api-spec';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { VirtualObjectLockHero } from './VirtualObjectLockHero';

vi.mock('@restate/features/invocation-route', () => ({
  Actions: () => null,
}));

const invocation: Invocation = {
  id: 'inv-lock-holder',
  created_at: '2026-08-23T12:00:00.000Z',
  modified_at: '2026-08-23T12:01:00.000Z',
  scheduled_at: '2026-08-23T12:00:00.000Z',
  invoked_by: 'ingress',
  status: 'paused',
  target: 'OrderObject/start',
  target_handler_name: 'start',
  target_service_name: 'OrderObject',
  target_service_key: 'order-1',
  target_service_ty: 'virtual_object',
};

const lockHolder: components['schemas']['VirtualObjectLockHolder'] = {
  id: invocation.id,
  kind: 'invocation',
  invocation,
  stage: 'paused',
  status: 'paused',
};

describe('VirtualObjectLockHero', () => {
  it('opens the paused error without following the invocation link', async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const pausedErrorQuery = adminApi(
      'query',
      '/query/invocations/{invocationId}/paused-error',
      'get',
      {
        baseUrl: '',
        parameters: { path: { invocationId: invocation.id } },
      },
    );
    queryClient.setQueryData(pausedErrorQuery.queryKey, {
      message: 'Database unavailable',
      relatedRestateErrorCode: '500',
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <VirtualObjectLockHero lockHolder={lockHolder} />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const pausedError = screen.getByRole('button', { name: 'after…' });
    expect(pausedError.closest('a')).toBeNull();
    expect(
      screen.getByRole('link', {
        name: `Open invocation ${invocation.id}`,
      }),
    ).toBeTruthy();

    await user.click(pausedError);

    expect(await screen.findByText('Database unavailable')).toBeTruthy();
  });
});
