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
    trigger:
      'mx-0.5 my-0.5 flex h-5 min-w-6 items-center justify-center gap-0 rounded-xl p-0 font-sans text-2xs font-medium shadow-none outline-offset-0',
    triggerLabel: 'block min-w-0 truncate',
  },
  variants: {
    isVoid: {
      true: {
        trigger:
          'pointer-events-none mx-0 w-fit border-transparent font-mono text-0.5xs leading-5 font-normal text-zinc-400',
        triggerLabel: 'mx-1.5',
      },
      false: {
        trigger: 'text-gray-500',
      },
    },
  },
  defaultVariants: {
    isVoid: false,
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

  const { data, isPending, error, isSuccess } = useGetJournalEntryPayloads(
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

  const isLoaded = entry?.isLoaded || isSuccess;

  return {
    data: data?.[field] as JournalEntryPayloads[F] | undefined,
    failure: data?.failure,
    isPending,
    error,
    isLoaded,
    onOpen: () => setShouldFetch(true),
  };
}

function PayloadPopover({
  title,
  triggerLabel,
  waterMark,
  children,
  onOpenChange,
  isVoid = false,
}: {
  title: string;
  triggerLabel: ReactNode;
  waterMark?: ReactNode;
  children: ReactNode;
  onOpenChange?: (isOpen: boolean) => void;
  isVoid?: boolean;
}) {
  const {
    base,
    value,
    content,
    trigger,
    triggerLabel: triggerLabelStyle,
  } = styles({ isVoid });

  return (
    <div className={base()}>
      <span className={value()}>
        <Popover onOpenChange={onOpenChange}>
          <PopoverTrigger>
            <Button className={trigger()} variant="secondary">
              {!isVoid && (
                <Icon name={IconName.Eye} className="mx-1.5 h-3 w-3 shrink-0" />
              )}
              <span className={triggerLabelStyle()}>
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
  const { data, failure, isPending, error, isLoaded, onOpen } = useLazyPayload(
    invocationId,
    entry,
    'value',
  );

  if (!entry || !invocationId || (hideWhenEntryIsPending && entry.isPending)) {
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

  const isVoid =
    isLoaded &&
    !data &&
    !failure &&
    (entry.resultType === 'void' || entry.resultType === 'success');

  return (
    <PayloadPopover
      title={title}
      triggerLabel={isVoid ? 'void' : title}
      isVoid={isVoid}
      waterMark={
        EncodingWaterMark && isBase64 && data ? (
          <EncodingWaterMark value={data} />
        ) : undefined
      }
      onOpenChange={(isOpen) => isOpen && onOpen()}
    >
      <PayloadContent isPending={isPending} error={error}>
        {data ? (
          <Value
            value={data}
            className="font-mono text-xs"
            isBase64={isBase64}
            showCopyButton
            portalId="expression-value"
          />
        ) : (
          isVoid && (
            <div className="py-2 text-xs text-zinc-500">
              No value returned (void)
            </div>
          )
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
  const { data, isPending, error, isLoaded, onOpen } = useLazyPayload(
    invocationId,
    entry,
    'parameters',
  );

  if (!entry || !invocationId) {
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
        {data ? (
          <Value
            value={data}
            className="font-mono text-xs"
            isBase64={isBase64}
            showCopyButton
            portalId="expression-value"
          />
        ) : (
          isLoaded && (
            <div className="py-2 text-xs text-zinc-500">No parameters</div>
          )
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
  const { data, isPending, error, isLoaded, onOpen } = useLazyPayload(
    invocationId,
    entry,
    'headers',
  );

  if (!entry || !invocationId) {
    return null;
  }

  return (
    <PayloadPopover
      title={title}
      triggerLabel={title}
      onOpenChange={(isOpen) => isOpen && onOpen()}
    >
      <PayloadContent isPending={isPending} error={error}>
        {data && data.length > 0 ? (
          <Headers headers={data} showCopyButton portalId="expression-value" />
        ) : (
          isLoaded && (
            <div className="py-2 text-xs text-zinc-500">No headers</div>
          )
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
  const { data, isPending, error, isLoaded, onOpen } = useLazyPayload(
    invocationId,
    entry,
    'keys',
  );

  if (!entry || !invocationId) {
    return null;
  }

  return (
    <PayloadPopover
      title={title}
      triggerLabel={title}
      onOpenChange={(isOpen) => isOpen && onOpen()}
    >
      <PayloadContent isPending={isPending} error={error}>
        {data && data.length > 0 ? (
          <Value
            value={JSON.stringify(data)}
            className="font-mono text-xs"
            showCopyButton
            portalId="expression-value"
          />
        ) : (
          isLoaded && <div className="py-2 text-xs text-zinc-500">No keys</div>
        )}
      </PayloadContent>
    </PayloadPopover>
  );
}

interface LazyFailureProps {
  invocationId?: string;
  entry?: JournalEntryV2;
  className?: string;
  isRetrying?: boolean;
  title?: string;
}

function LazyFailure({
  invocationId,
  entry,
  className,
  isRetrying,
  title,
}: LazyFailureProps) {
  const { failure, isPending } = useLazyPayload(invocationId, entry, 'failure');

  if (!entry || !invocationId) {
    return null;
  }

  if (entry.resultType !== 'failure') {
    return null;
  }

  if (isPending) {
    return (
      <div className={className}>
        <Spinner className="h-3 w-3" />
      </div>
    );
  }

  const errorData = entry.isLoaded
    ? entry.error
    : failure
      ? {
          message: failure.message,
          restateCode: failure.restate_code,
        }
      : undefined;

  if (!errorData) {
    return <span className={className}>Failed</span>;
  }

  return (
    <Failure
      restate_code={errorData.restateCode}
      message={errorData.message ?? 'Failed'}
      className={className}
      isRetrying={isRetrying}
      title={title}
    />
  );
}

export const LazyJournalEntryPayload = {
  Value: LazyValue,
  Parameters: LazyParameters,
  Headers: LazyHeaders,
  Keys: LazyKeys,
  Failure: LazyFailure,
};
