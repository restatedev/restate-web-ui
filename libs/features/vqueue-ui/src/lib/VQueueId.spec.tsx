import { fireEvent, render, screen } from '@testing-library/react';
import { VQueueId } from './VQueueId';

const useGetVqueue = vi.hoisted(() => vi.fn());

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
});
