import type {
  JournalEntryPayloads,
  JournalEntryV2,
} from '@restate/data-access/admin-api';
import { useGetJournalEntryPayloads } from '@restate/data-access/admin-api-hooks';
import { Button } from '@restate/ui/button';
import { Icon, IconName } from '@restate/ui/icons';
import { Spinner } from '@restate/ui/loading';
import { DropdownSection } from '@restate/ui/dropdown';
import { Popover, PopoverContent, PopoverTrigger } from '@restate/ui/popover';
import { Portal } from '@restate/ui/portal';
import { tv } from '@restate/util/styles';
import { ReactNode, useState } from 'react';
import { Value } from '../Value';
import { Headers } from '../Headers';
import { Failure } from '../Failure';
import { useRestateContext } from '@restate/features/restate-context';
import { ErrorBanner } from '@restate/ui/error';

const styles = tv({
  base: 'contents items-center gap-1 rounded-md py-0 pl-0.5 text-2xs text-zinc-700',
  slots: {
    value: 'mr-0.5 contents font-mono leading-5 font-semibold text-zinc-500',
    content:
      'mb-1 w-[90vw] max-w-[min(90vw,600px)] min-w-80 overflow-auto py-0 pr-0 pl-4',
  },
});

type PayloadField = keyof Pick<
  JournalEntryPayloads,
  'parameters' | 'value' | 'headers' | 'keys' | 'failure'
>;

function getPayloadEntryIndex(
  entry?: JournalEntryV2,
  field?: PayloadField,
): number | undefined {
  if (!entry) {
    return undefined;
  }
  const { type, category, index, completionIndex } = entry;

  if (category === 'notification') {
    return index;
  }

  switch (type) {
    case 'Call':
      return field === 'value' || field === 'failure' ? completionIndex : index;

    case 'Run':
    case 'GetPromise':
    case 'PeekPromise':
    case 'AttachInvocation':
    case 'Awakeable':
      return field === 'value' || field === 'failure' ? completionIndex : index;

    case 'Input':
    case 'Output':
    case 'OneWayCall':
    case 'SetState':
    case 'GetState':
    case 'GetEagerState':
    case 'GetStateKeys':
    case 'GetEagerStateKeys':
    case 'CompleteAwakeable':
    case 'CompletePromise':
      return index;

    default:
      return index;
  }
}

function getInitialData<F extends PayloadField>(
  entry: JournalEntryV2,
  field: F,
): Pick<JournalEntryPayloads, F> | undefined {
  if (!entry.isLoaded) {
    return undefined;
  }

  switch (field) {
    case 'value':
    case 'failure':
      return {
        value: (entry as { value?: string }).value,
        failure: (
          entry as { error?: { message?: string; restateCode?: string } }
        ).error
          ? {
              message: (entry as { error?: { message?: string } }).error
                ?.message,
              restate_code: (entry as { error?: { restateCode?: string } })
                .error?.restateCode,
            }
          : undefined,
      } as Pick<JournalEntryPayloads, F>;
    case 'parameters':
      return {
        parameters: (entry as { parameters?: string }).parameters,
        headers: (entry as { headers?: { key: string; value: string }[] })
          .headers,
      } as Pick<JournalEntryPayloads, F>;
    case 'headers':
      return {
        parameters: (entry as { parameters?: string }).parameters,
        headers: (entry as { headers?: { key: string; value: string }[] })
          .headers,
      } as Pick<JournalEntryPayloads, F>;
    case 'keys':
      return { keys: (entry as { keys?: string[] }).keys } as Pick<
        JournalEntryPayloads,
        F
      >;
    default:
      return undefined;
  }
}

function useLazyPayload<F extends PayloadField>(
  invocationId: string | undefined,
  entry: JournalEntryV2 | undefined,
  field: F,
) {
  const entryIndex = getPayloadEntryIndex(entry, field);
  const [shouldFetch, setShouldFetch] = useState(false);

  const shouldAutoFetch =
    !!entry?.error ||
    entry?.resultType === 'void' ||
    entry?.resultType === 'failure';

  const { data, isPending, error } = useGetJournalEntryPayloads(
    invocationId ?? '',
    entryIndex ?? -1,
    {
      enabled:
        entryIndex !== undefined &&
        !!invocationId &&
        !entry?.isLoaded &&
        (shouldFetch || shouldAutoFetch),
      refetchOnMount: false,
      staleTime: Infinity,
      initialData: entry ? getInitialData(entry, field) : undefined,
    },
  );

  return {
    data: data?.[field] as JournalEntryPayloads[F] | undefined,
    failure: data?.failure,
    isPending,
    error,
    onOpen: () => setShouldFetch(true),
  };
}

function PayloadPopover({
  title,
  triggerLabel,
  waterMark,
  children,
  onOpenChange,
}: {
  title: string;
  triggerLabel: ReactNode;
  waterMark?: ReactNode;
  children: ReactNode;
  onOpenChange?: (isOpen: boolean) => void;
}) {
  const { base, value, content } = styles();

  return (
    <div className={base()}>
      <span className={value()}>
        <Popover onOpenChange={onOpenChange}>
          <PopoverTrigger>
            <Button
              className="mx-0.5 my-0.5 flex h-5 min-w-6 items-center justify-center gap-0 rounded-xl p-0 font-sans text-2xs font-medium text-gray-500 shadow-none outline-offset-0"
              variant="secondary"
            >
              <Icon name={IconName.Eye} className="mx-1.5 h-3 w-3 shrink-0" />
              <span className="block min-w-0 truncate">
                {triggerLabel}
                <span className="inline-block w-3" />
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent>
            <DropdownSection
              className={content()}
              title={
                <div className="flex items-center text-0.5xs">
                  <span>{title}</span>
                  <div className="ml-auto">{waterMark}</div>
                  <Portal className="-mr-2 ml-2" id="expression-value" />
                </div>
              }
            >
              {children}
            </DropdownSection>
          </PopoverContent>
        </Popover>
      </span>
    </div>
  );
}

function PayloadContent({
  isPending,
  error,
  children,
}: {
  isPending: boolean;
  error: Error | null;
  children: ReactNode;
}) {
  return (
    <>
      {isPending && (
        <div className="flex items-center justify-center py-4">
          <Spinner />
        </div>
      )}
      {error && <ErrorBanner error={error} />}
      {children}
    </>
  );
}

interface LazyPayloadProps {
  invocationId?: string;
  entry?: JournalEntryV2;
  title?: string;
  isBase64?: boolean;
  hideWhenEntryIsPending?: boolean;
}

function LazyValue({
  invocationId,
  entry,
  title = 'Result',
  isBase64,
  hideWhenEntryIsPending = false,
}: LazyPayloadProps) {
  const { EncodingWaterMark } = useRestateContext();
  const { data, failure, isPending, error, onOpen } = useLazyPayload(
    invocationId,
    entry,
    'value',
  );

  if (!entry || !invocationId || (hideWhenEntryIsPending && entry.isPending)) {
    return null;
  }

  if (entry.isLoaded && !data && !failure) {
    if (entry.resultType === 'void' || entry.resultType === 'success') {
      return <div className="font-normal text-zinc-400">void</div>;
    }
    return null;
  }

  if (failure?.message) {
    return (
      <Failure
        message={failure.message}
        restate_code={failure.restate_code}
        isRetrying={entry.isRetrying}
        className="text-2xs"
      />
    );
  }

  return (
    <PayloadPopover
      title={title}
      triggerLabel={title}
      waterMark={
        EncodingWaterMark && isBase64 && data ? (
          <EncodingWaterMark value={data} />
        ) : undefined
      }
      onOpenChange={(isOpen) => isOpen && onOpen()}
    >
      <PayloadContent isPending={isPending} error={error}>
        {data && (
          <Value
            value={data}
            className="font-mono text-xs"
            isBase64={isBase64}
            showCopyButton
            portalId="expression-value"
          />
        )}
      </PayloadContent>
    </PayloadPopover>
  );
}

function LazyParameters({
  invocationId,
  entry,
  title = 'Parameters',
  isBase64,
}: LazyPayloadProps) {
  const { EncodingWaterMark } = useRestateContext();
  const { data, isPending, error, onOpen } = useLazyPayload(
    invocationId,
    entry,
    'parameters',
  );

  if (!entry || !invocationId) {
    return null;
  }

  if (entry.isLoaded && !data) {
    return null;
  }

  return (
    <PayloadPopover
      title={title}
      triggerLabel={title}
      waterMark={
        EncodingWaterMark && isBase64 && data ? (
          <EncodingWaterMark value={data} />
        ) : undefined
      }
      onOpenChange={(isOpen) => isOpen && onOpen()}
    >
      <PayloadContent isPending={isPending} error={error}>
        {data && (
          <Value
            value={data}
            className="font-mono text-xs"
            isBase64={isBase64}
            showCopyButton
            portalId="expression-value"
          />
        )}
      </PayloadContent>
    </PayloadPopover>
  );
}

function LazyHeaders({
  invocationId,
  entry,
  title = 'Headers',
}: Omit<LazyPayloadProps, 'isBase64'>) {
  const { data, isPending, error, onOpen } = useLazyPayload(
    invocationId,
    entry,
    'headers',
  );

  if (!entry || !invocationId) {
    return null;
  }

  if (entry.isLoaded && (!data || data.length === 0)) {
    return null;
  }

  return (
    <PayloadPopover
      title={title}
      triggerLabel={title}
      onOpenChange={(isOpen) => isOpen && onOpen()}
    >
      <PayloadContent isPending={isPending} error={error}>
        {data && data.length > 0 && (
          <Headers headers={data} showCopyButton portalId="expression-value" />
        )}
      </PayloadContent>
    </PayloadPopover>
  );
}

function LazyKeys({
  invocationId,
  entry,
  title = 'Keys',
}: Omit<LazyPayloadProps, 'isBase64'>) {
  const { data, isPending, error, onOpen } = useLazyPayload(
    invocationId,
    entry,
    'keys',
  );

  if (!entry || !invocationId) {
    return null;
  }

  if (entry.isLoaded && (!data || data.length === 0)) {
    return null;
  }

  return (
    <PayloadPopover
      title={title}
      triggerLabel={title}
      onOpenChange={(isOpen) => isOpen && onOpen()}
    >
      <PayloadContent isPending={isPending} error={error}>
        {data && data.length > 0 && (
          <Value
            value={JSON.stringify(data)}
            className="font-mono text-xs"
            showCopyButton
            portalId="expression-value"
          />
        )}
      </PayloadContent>
    </PayloadPopover>
  );
}

export const LazyJournalEntryPayload = {
  Value: LazyValue,
  Parameters: LazyParameters,
  Headers: LazyHeaders,
  Keys: LazyKeys,
};
