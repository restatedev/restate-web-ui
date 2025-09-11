import { useGetInvocationJournalWithInvocationV2 } from '@restate/data-access/admin-api-hooks';
import { ErrorBanner } from '@restate/ui/error';
import { useParams, useSearchParams } from 'react-router';
import { getRestateError, Status } from './Status';
import { HoverTooltip, TruncateWithTooltip } from '@restate/ui/tooltip';
import { DeploymentSection } from './DeploymentSection';
import { VirtualObjectSection } from './VirtualObjectSection';
import { KeysIdsSection } from './KeysIdsSection';
import { Link } from '@restate/ui/link';
import { Icon, IconName } from '@restate/ui/icons';
import { Section, SectionContent, SectionTitle } from '@restate/ui/section';
import { Actions } from './Actions';
import { JournalV2 } from './JournalV2';
import { useRestateContext } from '@restate/features/restate-context';
import { InvocationPageProvider } from './InvocationPageContext';
import { WorkflowKeySection } from './WorkflowKeySection';
import { tv } from '@restate/util/styles';
import { Copy } from '@restate/ui/copy';

const metadataContainerStyles = tv({
  base: 'mt-6 hidden grid-cols-1 gap-2 gap-y-4 rounded-xl md:grid-cols-2 [&:has(*)]:grid',
  variants: {
    isVirtualObject: {
      true: 'lg:grid-cols-2 2xl:grid-cols-4',
      false: '',
    },
    isWorkflow: {
      true: 'lg:grid-cols-3',
      false: '',
    },
    isPending: {
      true: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
      false: 'mb-24',
    },
  },
});
const lastFailureContainer = tv({
  base: 'col-span-full min-w-0 rounded-xl border bg-gray-200/50 p-0',
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
  const shouldShowFailure = Boolean(lastError);
  const shouldLastErrorBeExpanded = Boolean(
    shouldShowFailure &&
      (journalAndInvocationData?.completed_at ||
        journalAndInvocationData?.journal?.entries?.some(
          (entry) => entry.isRetrying || entry.type === 'Retrying',
        )),
  );
  const hasStack = lastError?.message.includes('\n');
  const isFailed = !!journalAndInvocationData?.completion_failure;

  const isVirtualObject =
    journalAndInvocationData?.target_service_ty === 'virtual_object';
  const isWorkflow = journalAndInvocationData?.target_service_ty === 'workflow';

  const isLive = searchParams.get('live') === 'true' && !error;

  return (
    <InvocationPageProvider isInInvocationPage>
      <div className="flex flex-col">
        <div className="@container flex flex-col gap-1">
          <Link
            className="flex items-center gap-1 text-sm text-gray-500"
            variant="secondary"
            href={`${baseUrl}/invocations${window.location.search}`}
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
          {shouldShowFailure && (
            <Section className={lastFailureContainer()}>
              <SectionTitle>
                {isFailed ? 'Completion failure' : 'Last failure'}
              </SectionTitle>
              <SectionContent className="flex-auto rounded-xl border-white/50 bg-linear-to-b from-gray-50 to-gray-50/80 shadow-zinc-800/3">
                <ErrorBanner
                  error={lastError}
                  wrap={hasStack}
                  className="h-full bg-transparent p-0 [&_code]:bg-gray-200/50 [&_details]:max-h-48"
                  open={shouldLastErrorBeExpanded}
                />
              </SectionContent>
            </Section>
          )}
        </div>

        <div className="mt-4 flex flex-col">
          <div className="relative rounded-2xl border bg-gray-200/50">
            <JournalV2
              invocationId={String(id)}
              key={String(id)}
              isLive={isLive}
              setIsLive={(value) => {
                setSearchParams((old) => {
                  old.set('live', String(value));
                  return old;
                });
              }}
            />
          </div>
        </div>
      </div>
    </InvocationPageProvider>
  );
}
export const invocation = { Component };
