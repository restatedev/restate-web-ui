import {
  EntryType,
  Invocation,
  JournalEntry,
  RawInvocation,
  useGetInvocationJournal,
  useGetInvocationJournalWithInvocation,
} from '@restate/data-access/admin-api';
import { Section, SectionContent, SectionTitle } from '@restate/ui/section';
import { Component, ComponentType, ErrorInfo, PropsWithChildren } from 'react';
import { tv } from 'tailwind-variants';
import { EntryProps } from './entries/types';
import { Input } from './entries/Input';
import { GetState } from './entries/GetState';
import { SetState } from './entries/SetState';
import { Sleep } from './entries/Sleep';
import { GetStateKeys } from './entries/GetStateKeys';
import { ClearState } from './entries/ClearState';
import { ClearAllState } from './entries/ClearAllState';
import { GetPromise } from './entries/GetPromise';
import { PeekPromise } from './entries/PeekPromise';
import { CompletePromise } from './entries/CompletePromise';
import { Awakeable } from './entries/Awakeable';
import { CompleteAwakeable } from './entries/CompleteAwakeable';
import { Run } from './entries/Run';
import { Output } from './entries/Output';
import { OneWayCall } from './entries/OneWayCall';
import { Call } from './entries/Call';
import { getRestateError } from './Status';
import { HoverTooltip } from '@restate/ui/tooltip';
import { SnapshotTimeProvider } from '@restate/util/snapshot-time';
import { Spinner } from '@restate/ui/loading';
import { ErrorBanner } from '@restate/ui/error';
import { CancelSignal } from './entries/CancelSignal';
import { Icon, IconName } from '@restate/ui/icons';

function getLastFailure(invocation?: Invocation) {
  const isOldProtocol =
    !invocation?.pinned_service_protocol_version ||
    invocation?.pinned_service_protocol_version < 5;

  if (isOldProtocol) {
    return {
      index: invocation?.last_failure_related_entry_index,
      name: invocation?.last_failure_related_entry_name,
      type: invocation?.last_failure_related_entry_type,
    };
  }
  return {
    index: invocation?.last_failure_related_command_index,
    name: invocation?.last_failure_related_command_name,
    type: invocation?.last_failure_related_command_type,
  };
}

export function Journal({ invocationId }: { invocationId?: string }) {
  const {
    data: journalAndInvocationData,
    isSuccess,
    isPending,
    dataUpdatedAt,
    error: apiError,
  } = useGetInvocationJournalWithInvocation(String(invocationId), {
    enabled: Boolean(invocationId),
    refetchOnMount: true,
    staleTime: 0,
  });
  const { journal: data, invocation } = journalAndInvocationData ?? {};
  const entries = (data?.entries ?? []).sort((a, b) => a.index - b.index);
  const error = getRestateError(invocation);
  const lastFailure = getLastFailure(invocation);

  const isOldProtocol =
    !invocation?.pinned_service_protocol_version ||
    invocation?.pinned_service_protocol_version < 5;

  return (
    <SnapshotTimeProvider lastSnapshot={dataUpdatedAt}>
      <div className="flex flex-col">
        {invocation &&
          entries.map((entry) => {
            return (
              <DefaultEntry
                key={entry.index}
                entry={entry}
                invocation={invocation}
                failed={
                  entry.command_index === lastFailure?.index ||
                  Boolean('failure' in entry && entry.failure)
                }
                appended
                {...(entry.command_index === lastFailure?.index && {
                  error,
                })}
              />
            );
          })}
        {invocation &&
          isOldProtocol &&
          lastFailure?.index === entries.length && (
            <DefaultEntry
              invocation={invocation}
              entry={
                {
                  entry_type: lastFailure.type,
                  name: lastFailure.name,
                  completed: true,
                  index: entries.length,
                  command_index: entries.length,
                } as any
              }
              failed
              appended={false}
              error={error}
            />
          )}
        {entries.length === 0 && isSuccess && (
          <div className="text-zinc-500/90 text-sm font-medium p-2 text-center">
            No entries found
            <div className="font-normal mt-1 text-code">
              Please note that once the invocation is completed, the entries
              will be cleared.{' '}
            </div>
          </div>
        )}
        {isPending && (
          <div className="flex items-center gap-1.5 text-sm text-zinc-500">
            <Spinner className="w-4 h-4" />
            Loading…
          </div>
        )}
        {apiError && <ErrorBanner error={apiError} />}
      </div>
    </SnapshotTimeProvider>
  );
}

const ENTRY_TYPE_LABEL: Record<EntryType, string> = {
  Input: 'Input',
  GetState: 'Get state',
  SetState: 'Set state',
  GetStateKeys: 'Get state keys',
  ClearState: 'Clear state',
  ClearAllState: 'Clear all state',
  Sleep: 'Sleep',
  GetPromise: 'Get promise',
  PeekPromise: 'Peak promise',
  CompletePromise: 'Complete promise',
  OneWayCall: 'One way call',
  Call: 'Call',
  Awakeable: 'Awakeable',
  CompleteAwakeable: 'Complete Awakeable',
  Run: 'Run',
  CancelInvocation: 'Cancel invocation',
  GetCallInvocationId: 'Get call invocation id',
  AttachInvocation: 'Attach invocation id',
  GetInvocationOutput: 'Get invocation output',
  Custom: 'Custom',
  Output: 'Output',
  GetEagerState: 'Get state',
  GetEagerStateKeys: 'Get state keys',
  CancelSignal: 'Cancel Signal',
};

const ENTRY_COMPONENTS: {
  [K in EntryType]?: ComponentType<
    EntryProps<JournalEntry & { entry_type: K; isRetrying?: boolean }>
  >;
} = {
  Input: Input,
  GetState: GetState,
  SetState: SetState,
  GetStateKeys: GetStateKeys,
  ClearState: ClearState,
  ClearAllState: ClearAllState,
  Sleep: Sleep,
  GetPromise: GetPromise,
  PeekPromise: PeekPromise,
  CompletePromise: CompletePromise,
  OneWayCall: OneWayCall,
  Call: Call,
  Awakeable: Awakeable,
  CompleteAwakeable: CompleteAwakeable,
  Run: Run,
  CancelInvocation: undefined,
  GetCallInvocationId: undefined,
  AttachInvocation: undefined,
  GetInvocationOutput: undefined,
  Custom: undefined,
  Output: Output,
  CancelSignal: CancelSignal,
};

const defaultEntryStyles = tv({
  base: '',
  slots: {
    entryItem:
      'flex items-center w-full gap-1 flex-wrap w-full min-w-0 mb-2 pl-2 bg-zinc-50 border-zinc-600/10 border rounded-none py-1 font-mono [font-size:95%] rounded -mt-px',
    circle:
      'w-3 h-3 rounded-full shrink-0 bg-zinc-100 border border-zinc-200 shadow-sm absolute left-0 top-[0.8625rem] -translate-y-1/2',
    line: 'absolute group-first:top-[0.5625rem] group-last:bottom-[calc(100%-0.5625rem+1px)] border-l left-[calc(0.35rem+0.5px)] top-0 bottom-0',
  },
  variants: {
    appended: {
      true: {
        line: '',
        base: '',
        circle: '',
        entryItem: '',
      },
      false: {
        line: '',
        base: '',
        circle: 'border-dashed shadow-none bg-transparent',
        entryItem: 'border-dashed',
      },
    },
    failed: {
      true: {
        line: '',
        base: '',
        circle: 'border-red-300 bg-red-100',
        entryItem: 'bg-red-50 border-red-200',
      },
      false: {
        line: '',
        base: '',
        circle: '',
        entryItem: '',
      },
    },
    completed: {
      true: {
        line: '',
        base: '',
        circle: '',
        entryItem: '',
      },
      false: {
        line: '',
        base: '',
        circle: 'bg-transparent border-0 text-zinc-400',
        entryItem: '',
      },
    },
    isRetrying: {
      true: {
        line: '',
        base: '',
        circle: 'border-orange-200 bg-orange-50',
        entryItem: 'border-orange-200 bg-orange-50',
      },
      false: {
        line: '',
        base: '',
        circle: '',
        entryItem: '',
      },
    },
    isEntrySignal: {
      true: {
        line: '',
        base: '',
        circle: '',
        entryItem: 'bg-transparent border-transparent',
      },
      false: {
        line: '',
        base: '',
        circle: '',
        entryItem: '',
      },
    },
  },
});

function isSignal(type: EntryType) {
  return type === 'CancelSignal';
}

function DefaultEntry({
  entry,
  failed,
  children,
  invocation,
  appended,
  error,
}: PropsWithChildren<EntryProps<JournalEntry>>) {
  const isRetrying = invocation.status === 'retrying';
  const isRetryingThisEntry =
    isRetrying &&
    failed &&
    (entry.version && entry.version >= 2
      ? !entry.completed
      : entry.index >= (invocation.journal_size ?? 0));
  const lastFailure = getLastFailure(invocation);

  const wasRetryingThisEntry =
    !isRetrying && failed && entry.command_index === (lastFailure.index ?? -1);
  const { base, line, circle, entryItem } = defaultEntryStyles();
  if (!entry.entry_type) {
    return null;
  }

  const EntrySpecificComponent = entry.entry_type
    ? (ENTRY_COMPONENTS[entry.entry_type] as ComponentType<
        EntryProps<JournalEntry>
      >)
    : undefined;
  const completed = 'completed' in entry ? !!entry.completed : true;

  if (!EntrySpecificComponent) {
    return null;
  }

  const isEntrySignal = isSignal(entry.entry_type);
  return (
    <div className="text-xs flex flex-col items-baseline gap-x-2 relative pl-6 group">
      <div
        className={line({ appended, failed, completed: completed || failed })}
      />
      <div
        className={circle({
          appended,
          failed,
          completed: completed || failed,
          isRetrying: isRetryingThisEntry || wasRetryingThisEntry,
        })}
      >
        {((!completed && !failed) || isRetryingThisEntry) && (
          <div className="inset-[-1px] absolute bg-white">
            <Spinner className="absolute inset-0 w-full h-full [&_circle]:opacity-0 text-zinc-300/70 fill-zinc-100" />
          </div>
        )}
        {isEntrySignal && (
          <div className="inset-[-1px] absolute bg-white">
            <Icon
              name={IconName.Radio}
              className="absolute inset-0 w-full h-full text-zinc-400/80 ml-[0.5px]"
            />
          </div>
        )}
        <HoverTooltip
          content={
            <div className="uppercase font-mono">
              {ENTRY_TYPE_LABEL[entry.entry_type]}
            </div>
          }
        >
          <div className="inset-0 w-full he-full absolute"></div>
        </HoverTooltip>
      </div>
      <ErrorBoundary entry={entry}>
        <div
          className={entryItem({
            appended,
            failed,
            completed,
            isRetrying: isRetryingThisEntry || wasRetryingThisEntry,
            isEntrySignal,
          })}
        >
          <EntrySpecificComponent
            entry={entry}
            failed={failed}
            invocation={invocation}
            error={error}
            isRetrying={isRetryingThisEntry}
            wasRetrying={wasRetryingThisEntry}
          />
        </div>
      </ErrorBoundary>
    </div>
  );
}

const sectionStyles = tv({
  base: '',
});
export function JournalSection({
  invocation,
  isPending,
  className,
}: {
  invocation?: Invocation;
  isPending?: boolean;
  className?: string;
}) {
  const { data, isSuccess } = useGetInvocationJournal(String(invocation?.id), {
    enabled: Boolean(invocation?.id),
    refetchOnMount: true,
  });
  if (!data || data.entries.length === 0) {
    return null;
  }

  return (
    <Section className={sectionStyles({ className })}>
      <SectionTitle>Journal</SectionTitle>
      <SectionContent className="">
        <Journal invocationId={invocation?.id} />
      </SectionContent>
    </Section>
  );
}

class ErrorBoundary extends Component<
  PropsWithChildren<{ entry?: JournalEntry }>,
  {
    hasError: boolean;
  }
> {
  constructor(props: PropsWithChildren<{ entry?: JournalEntry }>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): {
    hasError: boolean;
  } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by ErrorBoundary: ', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="truncate max-w-full flex items-center text-red-500 gap-1 flex-wrap w-full min-w-0 mb-2 px-2 bg-zinc-50 border-zinc-600/10 border py-1 font-mono [font-size:95%] rounded -mt-px">
          Failed to display {this.props.entry?.entry_type} entry
        </div>
      );
    }

    return this.props.children;
  }
}
