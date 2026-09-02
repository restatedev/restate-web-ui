import type {
  components,
  Invocation,
} from '@restate/data-access/admin-api-spec';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { VirtualObjectLockHero } from './VirtualObjectLockHero';

vi.mock('@restate/features/invocation-route', () => ({
  Actions: () => null,
}));

const apiHooks = vi.hoisted(() => ({
  useGetPausedError: vi.fn(),
}));

vi.mock('@restate/data-access/admin-api-hooks', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('@restate/data-access/admin-api-hooks')
  >()),
  useGetPausedError: apiHooks.useGetPausedError,
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
    apiHooks.useGetPausedError.mockImplementation(
      (_invocationId: string, options?: { enabled?: boolean }) => ({
        data: options?.enabled
          ? {
              message: 'Database unavailable',
              relatedRestateErrorCode: '500',
            }
          : undefined,
        error: null,
        isPending: false,
      }),
    );

    render(
      <MemoryRouter>
        <VirtualObjectLockHero lockHolder={lockHolder} />
      </MemoryRouter>,
    );

    const pausedError = screen.getByRole('button', { name: 'after…' });
    expect(pausedError.closest('a')).toBeNull();
    expect(
      screen.getByRole('link', {
        name: `Open invocation ${invocation.id}`,
      }),
    ).toBeTruthy();
    expect(apiHooks.useGetPausedError).toHaveBeenLastCalledWith(
      invocation.id,
      expect.objectContaining({ enabled: false }),
    );

    await user.click(pausedError);

    expect(await screen.findByText('Database unavailable')).toBeTruthy();
    expect(apiHooks.useGetPausedError).toHaveBeenLastCalledWith(
      invocation.id,
      expect.objectContaining({ enabled: true }),
    );
  });
});
