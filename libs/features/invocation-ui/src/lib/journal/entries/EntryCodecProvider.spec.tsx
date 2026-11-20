import type { JournalEntryV2 } from '@restate/data-access-admin-api-spec';
import { useGetInvocationStatusDetails } from '@restate/data-access-admin-api-hooks';
import { render } from '@testing-library/react';
import type { ComponentProps, PropsWithChildren } from 'react';
import { JournalEntriesContext } from '../JournalContext';
import { COMPACT_DETAIL } from '../useJournalDetail';
import { EntryCodecProvider } from './EntryCodecProvider';

vi.mock('@restate/data-access-admin-api-hooks', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('@restate/data-access-admin-api-hooks')
  >()),
  useGetInvocationStatusDetails: vi.fn(() => ({
    data: undefined,
    isPending: false,
    error: null,
  })),
}));

vi.mock('@restate/features-codec', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@restate/features-codec')>()),
  CodecOptionsProvider: ({ children }: PropsWithChildren) => children,
}));

const call = {
  category: 'command',
  type: 'Call',
  invocationId: 'inv_grandchild',
} as JournalEntryV2;

const expandedChild = { id: 'inv_child' } as ComponentProps<
  typeof EntryCodecProvider
>['invocation'];

describe('EntryCodecProvider', () => {
  beforeEach(() => {
    vi.mocked(useGetInvocationStatusDetails).mockClear();
  });

  it('reads a nested call from the statuses of the journal that shows it', () => {
    render(
      <JournalEntriesContext.Provider
        value={{ detail: COMPACT_DETAIL, referenceInvocationId: 'inv_root' }}
      >
        <EntryCodecProvider entry={call} invocation={expandedChild} />
      </JournalEntriesContext.Provider>,
    );

    expect(useGetInvocationStatusDetails).toHaveBeenCalledWith(
      'inv_grandchild',
      'inv_root',
    );
  });

  it('falls back to the invocation of the entry outside a journal', () => {
    render(<EntryCodecProvider entry={call} invocation={expandedChild} />);

    expect(useGetInvocationStatusDetails).toHaveBeenCalledWith(
      'inv_grandchild',
      'inv_child',
    );
  });
});
