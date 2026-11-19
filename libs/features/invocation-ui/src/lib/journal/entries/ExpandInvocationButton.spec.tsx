import type { ComponentProps } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { JournalContextProvider } from '../JournalContext';
import { COMPACT_DETAIL } from '../useJournalDetail';
import { ExpandInvocationButton } from './ExpandInvocationButton';

type ProviderProps = ComponentProps<typeof JournalContextProvider>;

const addInvocationId = vi.fn();
const removeInvocationId = vi.fn();

function journal(props: Partial<ProviderProps>) {
  return (
    <JournalContextProvider
      invocationIds={['inv_parent']}
      addInvocationId={addInvocationId}
      removeInvocationId={removeInvocationId}
      start={0}
      end={1}
      dataUpdatedAt={0}
      isLive={false}
      detail={COMPACT_DETAIL}
      {...props}
    >
      <ExpandInvocationButton
        invocationId="inv_child"
        parentInvocationId="inv_parent"
      />
    </JournalContextProvider>
  );
}

describe('ExpandInvocationButton', () => {
  it('follows the expansion state of its own invocation', () => {
    const { rerender, container } = render(journal({}));

    fireEvent.click(screen.getByRole('button', { name: 'Expand invocation' }));
    expect(addInvocationId).toHaveBeenCalledWith('inv_child');

    rerender(
      journal({
        invocationIds: ['inv_parent', 'inv_child'],
        isPending: { inv_child: true },
      }),
    );
    expect(container.querySelector('.animate-spin')).not.toBeNull();

    rerender(journal({ invocationIds: ['inv_parent', 'inv_child'] }));
    expect(container.querySelector('.animate-spin')).toBeNull();
    fireEvent.click(
      screen.getByRole('button', { name: 'Collapse invocation' }),
    );
    expect(removeInvocationId).toHaveBeenCalledWith('inv_child');

    rerender(
      journal({
        invocationIds: ['inv_parent', 'inv_child'],
        error: { inv_child: new Error('failed to load') },
      }),
    );
    expect(screen.queryByRole('button', { name: /invocation/ })).toBeNull();
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('warns instead of expanding an invocation shown earlier in the tree', () => {
    render(journal({ invocationIds: ['inv_child', 'inv_parent'] }));

    expect(screen.queryByRole('button', { name: /invocation/ })).toBeNull();
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });
});
