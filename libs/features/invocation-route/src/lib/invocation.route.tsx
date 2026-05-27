import {
  useGetInvocationJournalWithInvocationV2,
  useGetPausedError,
} from '@restate/data-access/admin-api-hooks';
import { ErrorBanner } from '@restate/ui/error';
import { useParams, useSearchParams } from 'react-router';
import { getRestateError, Status } from './Status';
import { DeploymentSection } from './DeploymentSection';
import { VirtualObjectSection } from './VirtualObjectSection';
import { KeysIdsSection } from './KeysIdsSection';
import { Link } from '@restate/ui/link';
import { Icon, IconName } from '@restate/ui/icons';
import { Section } from '@restate/ui/section';
import { Actions } from './actions';
import { JournalV2 } from './JournalV2';
import { Target } from './Target';
import { useRestateContext } from '@restate/features/restate-context';
import { InvocationPageProvider } from './InvocationPageContext';
import { WorkflowKeySection } from './WorkflowKeySection';
import { tv } from '@restate/util/styles';
import { Copy } from '@restate/ui/copy';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ContentPanel, ContentPanelBody } from '@restate/ui/content-panel';
import {
  Invocation,
  JournalEntryV2,
} from '@restate/data-access/admin-api-spec';
import { RestateError } from '@restate/util/errors';
import { setInvocationsRecent } from '@restate/util/sidebar-nav';

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
  base: 'z-20 min-w-0 origin-bottom-left rounded-xl p-0',
});
const lastFailureContent = tv({
  base: '-ml-4 max-w-fit flex-auto rounded-xl rounded-bl-none border bg-linear-to-b shadow-xl shadow-zinc-800/3 lg:mr-12 [&_.error]:max-h-72',
  variants: {
    isFailed: {
      true: 'border-red-400/50 from-red-50 to-red-50',
      false: 'border-orange-400/50 from-orange-50 to-orange-50',
    },
  },
});

// Floating page header: prominent banner card so target + status are the
// first things you read on the page. A status-tinted gradient washes in
// from the left and fades to white past mid-card, paired with a matching
// border. Layered shadow + inset white highlight give the lifted glass feel.
const headerCardStyles = tv({
  base: 'sticky top-3 z-30 mx-5 mt-2 flex items-center gap-3.5 rounded-2xl border bg-linear-to-r px-3 py-3 shadow-[0_1px_2px_-0.5px_--theme(--color-zinc-800/6%),0_12px_28px_-10px_--theme(--color-zinc-800/12%),inset_0_2px_0_0_--theme(--color-white/95%)] backdrop-blur-xl backdrop-saturate-200 transition-colors sm:top-6',
  variants: {
    intent: {
      success:
        'border-green-300/60 from-green-100 from-0% via-white via-50% to-green-50',
      danger:
        'border-red-300/60 from-red-100 from-0% via-white via-50% to-red-50',
      warning:
        'border-orange-300/60 from-orange-100 from-0% via-white via-50% to-orange-50',
      pending:
        'border-amber-300/60 from-amber-100 from-0% via-white via-50% to-amber-50',
      info: 'border-blue-300/60 from-blue-100 from-0% via-white via-50% to-blue-50',
      default:
        'border-gray-300/60 from-gray-200/50 from-0% via-white via-50% to-gray-100',
    },
  },
  defaultVariants: { intent: 'default' },
});

function getHeaderIntent(
  invocation?: Invocation,
): 'success' | 'danger' | 'warning' | 'info' | 'default' | 'pending' {
  if (!invocation) return 'default';
  if (invocation.isRetrying) return 'warning';
  switch (invocation.status) {
    case 'succeeded':
      return 'success';
    case 'failed':
      return 'danger';
    case 'pending':
      return 'pending';
    case 'paused':
    case 'scheduled':
    case 'backing-off':
      return 'warning';
    case 'running':
      return 'info';
    default:
      return 'default';
  }
}

function Component() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();

  // Review do we still use session storage for this. I thought it's memory. if so can be in a module var
  useEffect(() => {
    if (id) {
      setInvocationsRecent({ type: 'invocation', value: id });
    }
  }, [id]);

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

  const isPaused = journalAndInvocationData?.status === 'paused';
  const { data: pausedErrorData } = useGetPausedError(String(id), {
    enabled: isPaused,
    refetchOnMount: true,
    staleTime: 0,
  });
  const pausedError =
    isPaused && pausedErrorData?.message
      ? new RestateError(
          pausedErrorData.message,
          pausedErrorData.relatedRestateErrorCode,
          true,
          pausedErrorData.stack,
        )
      : undefined;

  const lastError = getRestateError(journalAndInvocationData) ?? pausedError;
  const shouldShowFailure =
    Boolean(lastError) &&
    !['killed', 'cancelled'].includes(String(journalAndInvocationData?.status));

  const isFailed = !!journalAndInvocationData?.completion_failure;

  const isVirtualObject =
    journalAndInvocationData?.target_service_ty === 'virtual_object';
  const isWorkflow = journalAndInvocationData?.target_service_ty === 'workflow';

  const [isCompact, setIsCompact] = useState(true);

  const { OnboardingGuide } = useRestateContext();
  // `?restore=1` is the invocations route's opt-in marker for restoring the
  // last filter/sort/column state from lastQuery — done via URL flag rather
  // than reading lastQuery here so navigation always uses the freshest
  // saved state. We keep any non-persistent detail-page params (panel,
  // etc.) so the back-nav preserves them; filter_*/sort_*/column come
  // from lastQuery and would conflict if forwarded.
  const invocationsBackHref = useMemo(() => {
    const out = new URLSearchParams();
    searchParams.forEach((value, key) => {
      if (
        key.startsWith('filter_') ||
        key.startsWith('sort_') ||
        key === 'column'
      ) {
        return;
      }
      out.append(key, value);
    });
    out.set('restore', '1');
    return `${baseUrl}/invocations?${out.toString()}`;
  }, [baseUrl, searchParams]);

  return (
    <InvocationPageProvider isInInvocationPage>
      <div className="flex min-h-0 flex-1 flex-col pt-4 [--cp-toolbar-top:5rem] [--cp-toolbar-tuck:5rem]">
        <div className="@container flex items-center gap-1.5 px-5 text-sm text-gray-500">
          <Link
            className="flex items-center gap-1 text-gray-500 hover:text-gray-700"
            variant="secondary"
            href={invocationsBackHref}
          >
            <Icon name={IconName.ArrowLeft} className="h-4 w-4" />
            Invocations
          </Link>
          <span className="text-gray-300">/</span>
          <h1 className="flex min-w-0 items-center gap-1.5 truncate py-0.5 font-mono text-sm font-normal text-gray-600">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white shadow-xs">
              <Icon
                name={IconName.Invocation}
                className="h-4 w-4 fill-blue-50 text-blue-500"
              />
            </span>
            <span className="min-w-0 truncate">{id}</span>
            <Copy
              copyText={String(id)}
              className="ml-0 shrink-0 rounded-md p-1 [&_svg]:h-3 [&_svg]:w-3"
            />
          </h1>
        </div>
        {/* Sticky floating header: target + status stay visible while the
            page scrolls. Status-tinted gradient telegraphs invocation state
            without coloring the whole card. */}
        <div
          className={headerCardStyles({
            intent: getHeaderIntent(journalAndInvocationData),
          })}
        >
          {journalAndInvocationData?.target && (
            <Target
              target={journalAndInvocationData.target}
              className="max-w-fit min-w-0 shrink rounded-lg p-0.5 pl-2 text-sm font-medium text-zinc-700 mix-blend-luminosity"
            />
          )}
          {journalAndInvocationData && (
            <div className="shrink-0 pr-2 *:origin-[center_left] *:scale-[1.15]">
              <Status invocation={journalAndInvocationData} className="" />
            </div>
          )}
          <div className="ml-auto shrink-0">
            <Actions
              invocation={journalAndInvocationData}
              mini={false}
              className="rounded-l-lg text-[0.9375rem]"
              splitClassName="rounded-r-lg"
            />
          </div>
        </div>
        <div className="flex flex-col gap-4 px-5">
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
              key={journalAndInvocationData?.status}
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
              <Anchor
                invocation={journalAndInvocationData}
                hasLastFailure={Boolean(lastError)}
              />

              <Section
                id="last-failure-section"
                className={lastFailureContainer({})}
              >
                <ErrorBanner
                  error={lastError}
                  className={lastFailureContent({ isFailed })}
                  isTransient={!isFailed}
                />
              </Section>
              {Boolean(
                journalAndInvocationData?.last_failure_related_command_index ??
                pausedErrorData?.relatedCommandIndex,
              ) && (
                <div className="-translate-y-2 px-2">
                  <Link
                    variant="icon"
                    className="inline-flex rounded-md px-2 text-xs"
                    href={`#command-${journalAndInvocationData?.last_failure_related_command_index ?? pausedErrorData?.relatedCommandIndex}`}
                  >
                    Go to the related line (#
                    {journalAndInvocationData?.last_failure_related_command_index ??
                      pausedErrorData?.relatedCommandIndex}
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
          {error && journalAndInvocationData && (
            <ErrorBanner error={error} className="rounded-xl" />
          )}
        </div>

        <ContentPanel
          className=""
          tabs={{
            items: [{ id: 'journal', label: 'Journal' }],
            defaultId: 'journal',
          }}
        >
          {OnboardingGuide && (
            <OnboardingGuide
              stage="view-invocation"
              service={journalAndInvocationData?.target_service_name}
            />
          )}
          <ContentPanelBody>
            <JournalV2
              invocationId={String(id)}
              key={String(id)}
              isCompact={isCompact}
              setIsCompact={setIsCompact}
            />
          </ContentPanelBody>
        </ContentPanel>
      </div>
    </InvocationPageProvider>
  );
}
export const invocation = { Component };

const anchorStyles = tv({
  base: '',
  slots: {
    line: 'invisible absolute top-3 right-0 left-0 z-10 min-h-9 border-l',
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
  hasLastFailure,
}: {
  invocation?: Invocation & { journal?: { entries?: JournalEntryV2[] } };
  hasLastFailure?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const { line, anchor } = anchorStyles({
    isFailed: Boolean(invocation?.completion_failure),
  });

  useEffect(() => {
    const element = ref.current;
    const bottomElement = () =>
      document.querySelector('[data-last-failure=true]') ??
      document.querySelector('[data-last-failure-fallback]');
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
        element.style.height = gap > 26 ? `${gap - 26}px` : '0px';
      }
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateStyles();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    updateStyles();

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
  }, [hasLastFailure]);

  return (
    <div className="relative z-40 w-4 -translate-x-full translate-y-4">
      <div ref={ref} className={line()}>
        <div className={anchor()} />
      </div>
    </div>
  );
}
