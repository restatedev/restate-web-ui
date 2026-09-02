import type { Invocation } from '@restate/data-access/admin-api-spec';
import { fireEvent, render, screen } from '@testing-library/react';
import { Status } from './Status';

const apiHooks = vi.hoisted(() => ({
  useGetPausedError: vi.fn(),
  useGetTransientError: vi.fn(),
}));

vi.mock('@restate/data-access/admin-api-hooks', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('@restate/data-access/admin-api-hooks')
  >()),
  useGetPausedError: apiHooks.useGetPausedError,
  useGetTransientError: apiHooks.useGetTransientError,
}));

interface ErrorQueryResult {
  data?: {
    message: string;
    relatedRestateErrorCode?: string;
    stack?: string;
  };
  error: Error | null;
  isPending: boolean;
}

type LazyErrorKind = 'paused' | 'transient';

let pausedResult: ErrorQueryResult;
let transientResult: ErrorQueryResult;

function invocation(kind: LazyErrorKind): Invocation {
  return {
    id: `inv-${kind}`,
    status: kind === 'paused' ? 'paused' : 'backing-off',
    isRetrying: kind === 'transient',
    retry_count: 3,
  } as Invocation;
}

function renderStatus(kind: LazyErrorKind) {
  return render(<Status invocation={invocation(kind)} timeline={false} />);
}

function triggerName(kind: LazyErrorKind) {
  return kind === 'paused' ? /after…/ : /3rd attempt/;
}

function setResult(kind: LazyErrorKind, result: ErrorQueryResult) {
  if (kind === 'paused') {
    pausedResult = result;
  } else {
    transientResult = result;
  }
}

beforeEach(() => {
  pausedResult = { data: undefined, error: null, isPending: false };
  transientResult = { data: undefined, error: null, isPending: false };
  apiHooks.useGetPausedError.mockImplementation(
    (_invocationId: string, options?: { enabled?: boolean }) =>
      options?.enabled
        ? pausedResult
        : { data: undefined, error: null, isPending: true },
  );
  apiHooks.useGetTransientError.mockImplementation(
    (_invocationId: string, options?: { enabled?: boolean }) =>
      options?.enabled
        ? transientResult
        : { data: undefined, error: null, isPending: true },
  );
});

it('keeps paused and transient error queries disabled until their popovers open', () => {
  render(
    <>
      <Status invocation={invocation('paused')} timeline={false} />
      <Status invocation={invocation('transient')} timeline={false} />
    </>,
  );

  expect(apiHooks.useGetPausedError).toHaveBeenLastCalledWith(
    'inv-paused',
    expect.objectContaining({ enabled: false }),
  );
  expect(apiHooks.useGetTransientError).toHaveBeenLastCalledWith(
    'inv-transient',
    expect.objectContaining({ enabled: false }),
  );
});

describe.each<LazyErrorKind>(['paused', 'transient'])(
  '%s error popover',
  (kind) => {
    it('shows a loading state while the request is pending', async () => {
      setResult(kind, { data: undefined, error: null, isPending: true });
      renderStatus(kind);

      fireEvent.click(screen.getByRole('button', { name: triggerName(kind) }));

      expect(
        await screen.findByText(
          kind === 'paused' ? 'Loading paused error…' : 'Loading last failure…',
        ),
      ).toBeTruthy();
    });

    it('shows an empty state when no error was recorded', async () => {
      setResult(kind, { data: undefined, error: null, isPending: false });
      renderStatus(kind);

      fireEvent.click(screen.getByRole('button', { name: triggerName(kind) }));

      expect(
        await screen.findByText(
          kind === 'paused'
            ? 'No paused error was recorded.'
            : 'No transient error was recorded.',
        ),
      ).toBeTruthy();
    });

    it('shows the API failure when the request fails', async () => {
      setResult(kind, {
        data: undefined,
        error: new Error(`Could not load ${kind} error`),
        isPending: false,
      });
      renderStatus(kind);

      fireEvent.click(screen.getByRole('button', { name: triggerName(kind) }));

      expect(
        await screen.findByText(`Could not load ${kind} error`),
      ).toBeTruthy();
    });

    it('shows the invocation error returned by the request', async () => {
      setResult(kind, {
        data: { message: `${kind} invocation error` },
        error: null,
        isPending: false,
      });
      renderStatus(kind);

      fireEvent.click(screen.getByRole('button', { name: triggerName(kind) }));

      expect(await screen.findByText(`${kind} invocation error`)).toBeTruthy();
    });
  },
);
