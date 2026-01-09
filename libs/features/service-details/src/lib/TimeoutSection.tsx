import { useListDeployments } from '@restate/data-access/admin-api-hooks';
import { Button } from '@restate/ui/button';
import { SectionTitle, Section } from '@restate/ui/section';
import { useSearchParams } from 'react-router';
import { SERVICE_TIMEOUT_EDIT } from './constants';
import { SubSection } from './SubSection';
import { tv } from '@restate/util/styles';
import { PropsWithChildren } from 'react';
import { Icon, IconName } from '@restate/ui/icons';
import { InlineTooltip } from '@restate/ui/tooltip';
import { Link } from '@restate/ui/link';
import { getProtocolType } from '@restate/data-access/admin-api';
import { Warning } from './Explainers';

export function TimeoutSection({
  className,
  isPending,
  service,
  isReadonly,
  revision,
  timeout,
}: {
  className?: string;
  isPending?: boolean;
  isReadonly?: boolean;
  service: string;
  revision?: number;
  timeout?: { inactivity?: string; abort?: string };
}) {
  const [, setSearchParams] = useSearchParams();
  const { data: listDeploymentsData } = useListDeployments();
  const deploymentId =
    listDeploymentsData?.services.get(service)?.deployments?.[
      Number(revision)
    ] ?? [];
  const isRequestResponse = deploymentId.some(
    (id) =>
      getProtocolType(listDeploymentsData?.deployments.get(id)) ===
      'RequestResponse',
  );

  return (
    <Section className="group">
      <SectionTitle className="flex items-center">
        Timeouts
        {isReadonly && (
          <Button
            variant="secondary"
            onClick={() =>
              setSearchParams(
                (old) => {
                  old.set(SERVICE_TIMEOUT_EDIT, service);
                  return old;
                },
                { preventScrollReset: true },
              )
            }
            className="ml-auto flex items-center gap-1 rounded-md bg-gray-50/50 px-1.5 py-0.5 font-sans text-xs font-normal shadow-none"
          >
            Edit…
          </Button>
        )}
      </SectionTitle>
      <div className="flex flex-col gap-2">
        <SubSection
          value={timeout?.inactivity ?? 'Default'}
          label="Inactivity"
          isPending={isPending}
          footer={
            <div className="flex flex-col gap-4">
              {isRequestResponse && (
                <Warning className="mt-0">
                  Inactivity timer not supported in this deployment. (Available
                  only in <code className="font-mono">Bidirectional</code>{' '}
                  mode.)
                </Warning>
              )}
              <JournalContainer>
                <Entry
                  className="col-start-1 col-end-2 row-start-1 row-end-2"
                  variant="completed"
                />
                <Entry
                  className="col-start-2 col-end-3 row-start-3 row-end-4"
                  variant="running"
                />
                <Entry
                  className="col-start-3 col-end-5 row-start-3 row-end-4"
                  variant="runningInBackground"
                />
                <Entry
                  className="col-start-3 col-end-5 row-start-5 row-end-6"
                  variant="suspended"
                />
                <Label
                  className="col-start-2 col-end-5 row-start-1 row-end-3 opacity-90 group-hover:opacity-100"
                  noLine
                >
                  <InlineTooltip
                    variant="indicator-button"
                    title="Inactivity timeout"
                    description={
                      <ul className="space-y-3">
                        <EntryReceived className="" />
                        <InactivityTimeoutReached className="opacity-70" />
                        <ResumeOnUpdate className="opacity-70" />
                        <LearnMore />
                      </ul>
                    }
                  >
                    <span className="font-mono italic">
                      sleep(…) {`> ${timeout?.inactivity ?? '1m'}`}
                    </span>
                  </InlineTooltip>
                </Label>
                <Label
                  className="col-start-2 col-end-3 row-start-4 row-end-6"
                  align="center"
                >
                  <InlineTooltip
                    variant="indicator-button"
                    title="Inactivity timeout"
                    description={
                      <ul className="space-y-3">
                        <EntryReceived className="opacity-70" />
                        <InactivityTimeoutReached />
                        <ResumeOnUpdate className="opacity-70" />
                        <LearnMore />
                      </ul>
                    }
                  >
                    Inactivity
                  </InlineTooltip>
                </Label>
                <Label
                  className="col-start-3 col-end-5 row-start-6 row-end-7"
                  noLine
                >
                  <InlineTooltip
                    variant="indicator-button"
                    title="Inactivity timeout"
                    description={
                      <ul className="space-y-3">
                        <EntryReceived className="opacity-70" />
                        <InactivityTimeoutReached className="opacity-70" />
                        <ResumeOnUpdate />
                        <LearnMore />
                      </ul>
                    }
                  >
                    Suspended
                  </InlineTooltip>
                </Label>
              </JournalContainer>
            </div>
          }
        />
        <SubSection
          value={timeout?.abort ?? 'Default'}
          label="Abort"
          isPending={isPending}
          footer={
            <JournalContainer>
              <Entry
                className="col-start-1 col-end-2 row-start-1 row-end-2"
                variant="completed"
              />
              <Entry
                className="col-start-2 col-end-3 row-start-3 row-end-4"
                variant="running"
              />
              <Entry
                className="relative col-start-3 col-end-4 row-start-3 row-end-4 rounded-l-none rounded-r-sm bg-orange-200"
                variant="running"
              >
                <div className="absolute -top-0.5 -bottom-0.5 -left-1 w-1 bg-gray-100" />
              </Entry>
              <div className="relative col-start-4 col-end-5 row-start-3 row-end-4 fill-orange-400 pl-1">
                <Icon
                  name={IconName.TriangleAlert}
                  className="h-3.5 w-3.5 -translate-y-1 fill-orange-100 text-orange-400/70"
                />
              </div>

              <Entry
                className="col-start-4 col-end-5 row-start-5 row-end-6 ml-4"
                variant="retrying"
              />
              <Label
                className="col-start-2 col-end-5 row-start-1 row-end-3 opacity-90 group-hover:opacity-100"
                noLine
              >
                <InlineTooltip
                  variant="indicator-button"
                  title="Abort timeout"
                  description={
                    <ul className="space-y-3">
                      <EntryReceivedForAbort className="" />
                      <InactivityTimeoutReached className="opacity-70" />
                      <ResumeOnUpdate className="opacity-70" />
                      <LearnMore />
                    </ul>
                  }
                >
                  <span className="font-mono italic">
                    run(…){' '}
                    {`> ${timeout?.inactivity ?? '1m'} + ${timeout?.abort ?? '1m'}`}
                  </span>
                </InlineTooltip>
              </Label>
              <Label
                className="col-start-2 col-end-3 row-start-4 row-end-6"
                align="center"
              >
                <InlineTooltip
                  variant="indicator-button"
                  title="Abort timeout"
                  description={
                    <ul className="space-y-3">
                      <EntryReceivedForAbort className="opacity-70" />
                      <InactivityTimeoutReached />
                      <AbortTimeoutReached className="opacity-70" />
                      <LearnMore />
                    </ul>
                  }
                >
                  Inactivity
                </InlineTooltip>
              </Label>
              <Label
                className="col-start-3 col-end-4 row-start-4 row-end-6"
                align="center"
              >
                <InlineTooltip
                  variant="indicator-button"
                  title="Abort timeout"
                  description={
                    <ul className="space-y-3">
                      <EntryReceivedForAbort className="opacity-70" />
                      <InactivityTimeoutReached className="opacity-70" />
                      <AbortTimeoutReached />
                      <LearnMore />
                    </ul>
                  }
                >
                  Abort
                </InlineTooltip>
              </Label>
              <Label className="col-start-4 col-end-5 row-start-6 row-end-7 ml-4">
                Retrying
              </Label>
            </JournalContainer>
          }
        />
      </div>
    </Section>
  );
}

const gridStyles = tv({
  base: 'grid grid-cols-[2rem_1fr_1fr_12ch] grid-rows-[0.5rem_0.5rem_0.5rem_0.5rem_0.5rem_1rem] mask-[linear-gradient(to_right,transparent_0,black_20px,black_calc(100%-20px),transparent_100%)] text-2xs',
});

function JournalContainer({
  className,
  children,
}: PropsWithChildren<{ className?: string }>) {
  return <div className={gridStyles({ className })}>{children}</div>;
}

const entryStyles = tv({
  base: 'h-full w-full border border-dashed border-transparent',
  variants: {
    variant: {
      suspended: 'rounded-l-sm border-gray-400 bg-gray-200',
      completed: 'rounded-sm bg-blue-300/80',
      running: 'rounded-sm bg-blue-300/80',
      runningInBackground:
        '-ml-1 border-blue-300/80 border-l-transparent bg-blue-300/15',
      retrying: 'rounded-l-sm bg-blue-300/80',
    },
  },
});

function Entry({
  className,
  children,
  variant,
}: PropsWithChildren<{
  className?: string;
  variant:
    | 'suspended'
    | 'completed'
    | 'running'
    | 'runningInBackground'
    | 'retrying';
}>) {
  return (
    <div
      className={entryStyles({
        className,
        variant,
      })}
    >
      {children}
    </div>
  );
}

const labelStyles = tv({
  base: 'relative h-full w-full',
  slots: {
    container: 'absolute inset-0 flex',
    line: 'absolute top-1/2 right-1 left-1 -translate-y-1/2 border-b border-dashed border-gray-400/70',
  },
  variants: {
    align: {
      center: {
        container: 'justify-center',
        line: '',
      },
      start: { container: 'justify-start' },
    },
    noLine: {
      true: {
        line: 'hidden',
      },
      false: {},
    },
  },
  defaultVariants: {
    align: 'start',
    noLine: false,
  },
});

function Label({
  className,
  children,
  align,
  noLine,
}: PropsWithChildren<{
  className?: string;
  noLine?: boolean;
  align?: 'start' | 'center';
}>) {
  const { base, container, line } = labelStyles({ align, noLine });
  return (
    <div className={base({ className })}>
      <div className={container()}>
        <div className={line()} />
        <div className="relative inline bg-gray-100 px-1">{children}</div>
      </div>
    </div>
  );
}

const liStyles = tv({
  base: 'font-normal text-gray-50/90',
});
const EntryReceived = ({ className }: { className?: string }) => (
  <li className={liStyles({ className })}>
    <strong className="font-medium text-gray-50">New entry received:</strong>{' '}
    When Restate logs a new journal entry (e.g. sleep, call), an inactivity
    timer starts to prevent stalled invocations.
  </li>
);
const EntryReceivedForAbort = ({ className }: { className?: string }) => (
  <li className={liStyles({ className })}>
    <strong className="font-medium text-gray-50">New entry received:</strong>{' '}
    When Restate logs a new journal entry (e.g. run), an inactivity timer starts
    to prevent stalled invocations.
  </li>
);
const InactivityTimeoutReached = ({ className }: { className?: string }) => (
  <li className={liStyles({ className })}>
    <strong className="font-medium text-gray-50">
      Inactivity Timeout reached:
    </strong>{' '}
    If no next entry arrives within the timer, Restate gracefully suspends the
    invocation (intermediate progress is preserved).
  </li>
);
const AbortTimeoutReached = ({ className }: { className?: string }) => (
  <li className={liStyles({ className })}>
    <strong className="font-medium text-gray-50">Abort Timeout reached:</strong>{' '}
    A separate timer that begins when the inactivity timeout is reached. If the
    invocation does not suspend within this grace period, Restate aborts the
    invocation. If the new entry is a <code>run()</code>, suspension is not
    supported, and the only way to avoid an abort error is for the{' '}
    <code>run</code> to finish before the abort timeout expires.
  </li>
);
const ResumeOnUpdate = ({ className }: { className?: string }) => (
  <li className={liStyles({ className })}>
    <strong className="font-medium">Resume on update:</strong> When Restate
    receives updates for the journal entry (e.g. sleep finishes, service call
    returns), it resumes the invocation and continues execution.
  </li>
);

const LearnMore = () => (
  <li>
    <Link
      className="mt-2 inline-flex items-center gap-2 rounded-lg bg-zinc-600 px-2 py-1 text-sm text-gray-100 hover:bg-zinc-500 pressed:bg-zinc-400"
      rel="noopener noreferrer"
      target="_blank"
      variant="button"
      href="https://docs.restate.dev/services/configuration#timeouts"
    >
      Learn more
      <Icon name={IconName.ExternalLink} className="h-[1em] w-[1em]" />
    </Link>
  </li>
);
