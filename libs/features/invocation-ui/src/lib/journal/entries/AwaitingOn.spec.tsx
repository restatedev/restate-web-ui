import type { InvocationFuture } from '@restate/data-access-admin-api-spec';
import { render, screen } from '@testing-library/react';
import { AwaitingOn } from './AwaitingOn';

const cancel = { Single: { SignalIndex: 1 } };
const completion = (id: number) => ({ Single: { CompletionId: id } });

function renderAwaitingOn(future: unknown) {
  return render(
    <AwaitingOn
      future={future as InvocationFuture}
      invocationId="inv_1"
      state="suspended"
      isPending
    />,
  );
}

describe('AwaitingOn', () => {
  it('hides the cancel signal wrapped in FirstCompleted', () => {
    renderAwaitingOn({ FirstCompleted: [cancel, completion(1)] });

    expect(screen.getByRole('button').textContent).toBe('awaiting 1 entry');
  });

  it('hides the cancel signal in a pre-v7 Unknown group', () => {
    renderAwaitingOn({ Unknown: [cancel, completion(1), completion(2)] });

    expect(screen.getByRole('button').textContent).toBe('awaiting 2 entries');
  });

  it('keeps an Unknown group without a cancel signal intact', () => {
    renderAwaitingOn({ Unknown: [completion(1), completion(2)] });

    expect(screen.getByRole('button').textContent).toBe('awaiting 2 entries');
  });
});
