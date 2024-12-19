import {
  EntryType,
  Invocation,
  JournalEntry,
  useGetInvocationJournal,
} from '@restate/data-access/admin-api';
import { Badge } from '@restate/ui/badge';
import { Ellipsis, Spinner } from '@restate/ui/loading';
import { Section, SectionContent, SectionTitle } from '@restate/ui/section';
import { ComponentType, PropsWithChildren } from 'react';
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

const styles = tv({
  base: '',
});
export function Journal({ invocation }: { invocation?: Invocation }) {
  const { data, isSuccess, isPending } = useGetInvocationJournal(
    String(invocation?.id),
    {
      enabled: Boolean(invocation?.id),
      refetchOnMount: true,
    }
  );
  const entries = (data?.entries ?? []).sort((a, b) => a.index - b.index);
  if (!invocation) {
    return null;
  }
  const error = getRestateError(invocation);

  return (
    <div className="flex flex-col">
      {entries.map((entry) => {
        return (
          <DefaultEntry
            key={entry.index}
            entry={entry}
            invocation={invocation}
            failed={
              entry.index === invocation?.last_failure_related_entry_index ||
              Boolean('failure' in entry && entry.failure)
            }
            appended
            {...(entry.index ===
              invocation?.last_failure_related_entry_index && {
              error,
            })}
          />
        );
      })}
      {invocation?.last_failure_related_entry_index === entries.length && (
        <DefaultEntry
          invocation={invocation}
          entry={
            {
              entry_type: invocation.last_failure_related_entry_type,
              name: invocation.last_failure_related_entry_name,
              completed: true,
              index: entries.length,
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
            Please note that once the invocation is completed, the entries will
            be cleared.{' '}
          </div>
        </div>
      )}
      {isPending && (
        <div className="flex items-center gap-1.5 text-sm text-zinc-500">
          <Spinner className="w-4 h-4" />
          Loading…
        </div>
      )}
    </div>
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
};

const ENTRY_COMPONENTS: {
  [K in EntryType]?: ComponentType<
    EntryProps<JournalEntry & { entry_type: K }>
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
  },
});
function DefaultEntry({
  entry,
  failed,
  children,
  invocation,
  appended,
  error,
}: PropsWithChildren<EntryProps<JournalEntry>>) {
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
  return (
    <div className="text-xs flex flex-col items-baseline gap-x-2 relative pl-6 group">
      <div className={line({ appended, failed, completed })} />
      <div className={circle({ appended, failed, completed })}>
        {!completed && (
          <div className="inset-[-1px] absolute">
            <Spinner className="w-full h-full [&_circle]:opacity-0" />
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

      {EntrySpecificComponent ? (
        <div className={entryItem({ appended, failed, completed })}>
          <EntrySpecificComponent
            entry={entry}
            failed={failed}
            invocation={invocation}
            error={error}
          />
        </div>
      ) : (
        <Badge
          variant={failed ? 'danger' : 'default'}
          size="sm"
          className="shrink-0 [&:has(+*)]:rounded-b-none [&:has(+*)]:mb-0 uppercase my-1 font-mono font-normal text-2xs py-0 px-1 leading-4 rounded"
        >
          <Ellipsis visible={'completed' in entry && entry.completed === false}>
            {ENTRY_TYPE_LABEL[entry.entry_type]}
          </Ellipsis>
        </Badge>
      )}
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
      <SectionTitle>Execution Logs</SectionTitle>
      <SectionContent className="">
        <Journal invocation={invocation} />
      </SectionContent>
    </Section>
  );
}