import { useGetInvocationJournalWithInvocationV2 } from '@restate/data-access/admin-api-hooks';
import { ErrorBanner } from '@restate/ui/error';
import { useParams, useSearchParams } from 'react-router';
import { getRestateError, Status } from './Status';
import { HoverTooltip } from '@restate/ui/tooltip';
import { DeploymentSection } from './DeploymentSection';
import { VirtualObjectSection } from './VirtualObjectSection';
import { KeysIdsSection } from './KeysIdsSection';
import { Link } from '@restate/ui/link';
import { Icon, IconName } from '@restate/ui/icons';
import { Section } from '@restate/ui/section';
import { Actions } from './actions';
import { JournalV2 } from './JournalV2';
import { useRestateContext } from '@restate/features/restate-context';
import { InvocationPageProvider } from './InvocationPageContext';
import { WorkflowKeySection } from './WorkflowKeySection';
import { tv } from '@restate/util/styles';
import { Copy } from '@restate/ui/copy';
import { LIVE_JOURNAL } from './constants';
import { useEffect, useRef, useState } from 'react';
import { Invocation, JournalEntryV2 } from '@restate/data-access/admin-api';

const metadataContainerStyles = tv({
  base: 'mt-6 hidden grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-2 gap-y-4 rounded-xl [&:has(*)]:grid',
  variants: {
    isVirtualObject: {
      true: '',
      false: '',
    },
    isWorkflow: {
      true: '',
      false: '',
    },
    isPending: {
      true: '',
      false: '',
    },
  },
});
const lastFailureContainer = tv({
  base: 'min-w-0 origin-bottom-left rounded-xl p-0',
});
const lastFailureContent = tv({
  base: 'flex-auto rounded-xl rounded-bl-none border bg-linear-to-b shadow-xl shadow-zinc-800/3 lg:mr-12 [&_details]:max-h-48',
  variants: {
    isFailed: {
      true: 'border-red-400/50 from-red-50 to-red-50',
      false: 'border-orange-400/50 from-orange-50 to-orange-50',
    },
  },
});
const lastFailureStyles = tv({
  base: 'h-full bg-transparent p-0 [&_details]:max-h-48',
});

function Component() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const {
    data: journalAndInvocationData,
    isPending,
    error,
  } = useGetInvocationJournalWithInvocationV2(String(id), {
    refetchOnMount: true,
    staleTime: 0,
    enabled: Boolean(id),
  });

  const { baseUrl } = useRestateContext();

  const lastError = getRestateError(journalAndInvocationData);
  const shouldShowFailure =
    Boolean(lastError) &&
    !['killed', 'cancelled'].includes(String(journalAndInvocationData?.status));

  const hasStack = lastError?.message.includes('\n');
  const isFailed = !!journalAndInvocationData?.completion_failure;

  const isVirtualObject =
    journalAndInvocationData?.target_service_ty === 'virtual_object';
  const isWorkflow = journalAndInvocationData?.target_service_ty === 'workflow';

  const isLive = searchParams.get(LIVE_JOURNAL) === 'true' && !error;
  const [isCompact, setIsCompact] = useState(true);

  const { OnboardingGuide } = useRestateContext();

  const invocationsSearchParams = new URLSearchParams(searchParams);
  invocationsSearchParams.delete(LIVE_JOURNAL);

  return (
    <InvocationPageProvider isInInvocationPage>
      <div className="flex flex-col">
        <div className="@container flex flex-col gap-1">
          <Link
            className="flex items-center gap-1 text-sm text-gray-500"
            variant="secondary"
            href={`${baseUrl}/invocations?${invocationsSearchParams.toString()}`}
          >
            <Icon name={IconName.ArrowLeft} className="mt-0.5 h-4 w-4" />{' '}
            Invocations
          </Link>
          <div className="relative flex flex-col gap-x-2 gap-y-1.5 @2xl:flex-row @2xl:items-center">
            <h1 className="flex max-w-[20ch] items-center gap-1 truncate pb-1 font-mono text-lg font-semibold text-gray-900 sm:text-lg">
              <div className="mr-1.5 shrink-0 rounded-xl border bg-white shadow-xs">
                <Icon
                  name={IconName.Invocation}
                  className="h-8 w-8 fill-blue-50 p-1.5 text-blue-400 drop-shadow-md"
                />
              </div>

              <HoverTooltip
                size="sm"
                content={
                  <div className="flex h-4 items-center gap-4 leading-4">
                    <div>{id}</div>
                    <Copy
                      copyText={String(id)}
                      className="ml-auto h-5 w-5 rounded-xs bg-zinc-800/90 p-1 hover:bg-zinc-600 pressed:bg-zinc-500"
                    />
                  </div>
                }
              >
                {id?.substring(0, 8)}…{id?.slice(-5)}
              </HoverTooltip>
            </h1>
            {journalAndInvocationData && (
              <div className="*:origin-[center_left] *:scale-[1.1]">
                <Status invocation={journalAndInvocationData} className="" />
              </div>
            )}
            <div className="absolute right-0">
              <Actions
                invocation={journalAndInvocationData}
                mini={false}
                className="text-sm"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div
            className={metadataContainerStyles({
              isVirtualObject,
              isPending,
              isWorkflow,
            })}
          >
            {isPending && (
              <>
                <div className="min-h-24 w-full animate-pulse rounded-xl bg-slate-200" />
                <div className="min-h-24 w-full animate-pulse rounded-xl bg-slate-200" />
                <div className="hidden min-h-24 w-full animate-pulse rounded-xl bg-slate-200 lg:block" />
                <div className="hidden min-h-24 w-full animate-pulse rounded-xl bg-slate-200 lg:block" />
              </>
            )}
            <KeysIdsSection
              invocation={journalAndInvocationData}
              className="h-fit rounded-xl border bg-gray-200/50 p-0 [&>*:last-child]:rounded-xl [&>*:last-child]:border-white/50 [&>*:last-child]:bg-linear-to-b [&>*:last-child]:from-gray-50 [&>*:last-child]:to-gray-50/80 [&>*:last-child]:shadow-zinc-800/3"
            />
            <DeploymentSection
              invocation={journalAndInvocationData}
              className="h-fit rounded-xl border bg-gray-200/50 p-0 [&>*:last-child]:rounded-xl [&>*:last-child]:border-white/50 [&>*:last-child]:bg-linear-to-b [&>*:last-child]:from-gray-50 [&>*:last-child]:to-gray-50/80 [&>*:last-child]:shadow-zinc-800/3"
              raised
            />
            <VirtualObjectSection
              invocation={journalAndInvocationData}
              raised
              className="contents *:h-fit *:rounded-xl *:border *:bg-gray-200/50 [&>*:last-child>h3]:mt-0 [&>*>*:last-child]:rounded-xl [&>*>*:last-child]:border-white/50 [&>*>*:last-child]:bg-linear-to-b [&>*>*:last-child]:from-gray-50 [&>*>*:last-child]:to-gray-50/80 [&>*>*:last-child]:shadow-zinc-800/3"
            />
            <WorkflowKeySection
              invocation={journalAndInvocationData}
              raised
              className="h-fit rounded-xl border bg-gray-200/50 p-0 [&>*:last-child]:rounded-xl [&>*:last-child]:border-white/50 [&>*:last-child]:bg-linear-to-b [&>*:last-child]:from-gray-50 [&>*:last-child]:to-gray-50/80 [&>*:last-child]:shadow-zinc-800/3"
            />
          </div>
          {shouldShowFailure && !error && (
            <>
              <Anchor invocation={journalAndInvocationData} />

              <Section
                id="last-failure-section"
                className={lastFailureContainer({})}
              >
                <ErrorBanner
                  error={lastError}
                  wrap={hasStack}
                  className={lastFailureContent({ isFailed })}
                  isTransient={!isFailed}
                />
              </Section>
              {Boolean(
                journalAndInvocationData?.last_failure_related_command_index,
              ) && (
                <div className="-translate-y-2 px-2">
                  <Link
                    variant="icon"
                    className="inline-flex rounded-md px-2 text-xs"
                    href={`#command-${journalAndInvocationData?.last_failure_related_command_index}`}
                  >
                    Go to the related line (#
                    {
                      journalAndInvocationData?.last_failure_related_command_index
                    }
                    )
                    <Icon
                      name={IconName.ChevronDown}
                      className="ml-1 h-4 w-4"
                    />
                  </Link>
                </div>
              )}
            </>
          )}
        </div>

        <div className="mt-24 flex flex-col">
          {OnboardingGuide && (
            <OnboardingGuide
              stage="view-invocation"
              service={journalAndInvocationData?.target_service_name}
            />
          )}
          <div className="relative rounded-2xl border bg-gray-200/50">
            <JournalV2
              invocationId={String(id)}
              key={String(id)}
              isLive={isLive}
              setIsLive={(value) => {
                setSearchParams((old) => {
                  old.set(LIVE_JOURNAL, String(value));
                  return old;
                });
              }}
              isCompact={isCompact}
              setIsCompact={setIsCompact}
            />
          </div>
        </div>
      </div>
    </InvocationPageProvider>
  );
}
export const invocation = { Component };

const anchorStyles = tv({
  base: '',
  slots: {
    line: 'invisible absolute top-0 right-0 left-0 z-10 min-h-9 translate-x-full rounded-t-xl border-l',
    anchor:
      'absolute bottom-0 left-0 z-10 h-2 w-2 -translate-x-1/2 rounded-full border-2 border-white/60',
  },
  variants: {
    isFailed: {
      true: { line: 'border-red-400/50', anchor: 'bg-red-400' },
      false: { line: 'border-orange-400/50', anchor: 'bg-orange-400' },
    },
  },
});

function Anchor({
  invocation,
}: {
  invocation?: Invocation & { journal?: { entries?: JournalEntryV2[] } };
}) {
  const ref = useRef<HTMLDivElement>(null);

  const hasLastFailure = Boolean(
    invocation?.last_failure || invocation?.completion_failure,
  );
  const { line, anchor } = anchorStyles({
    isFailed: Boolean(invocation?.completion_failure),
  });

  useEffect(() => {
    const element = ref.current;
    const bottomElement = () =>
      document.querySelector('[data-last-failure=true]');
    const topElement = () => document.querySelector('#last-failure-section');
    const updateStyles = () => {
      const bottomRect = bottomElement()?.getBoundingClientRect();
      const topRect = topElement()?.getBoundingClientRect();
      const gap =
        Number(bottomRect?.top) -
        Number(topRect?.top) +
        Number(bottomRect?.height);
      if (element) {
        element.style.visibility = 'visible';
        element.style.height = gap > 14 ? `${gap - 14}px` : '0px';
      }
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateStyles();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          updateStyles();
        }
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      observer.disconnect();
    };
  }, []);

  return (
    <div className="relative z-[11] w-6 -translate-x-full translate-y-4">
      <div ref={ref} className={line()}>
        {hasLastFailure && <div className={anchor()} />}
      </div>
    </div>
  );
}
