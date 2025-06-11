import { useGetInvocationJournalWithInvocationV2 } from '@restate/data-access/admin-api';
import { ErrorBanner } from '@restate/ui/error';
import { useParams } from 'react-router';
import { getRestateError, Status } from './Status';
import { TruncateWithTooltip } from '@restate/ui/tooltip';
import { DeploymentSection } from './DeploymentSection';
import { VirtualObjectSection } from './VirtualObjectSection';
import { KeysIdsSection } from './KeysIdsSection';
import { Link } from '@restate/ui/link';
import { Icon, IconName } from '@restate/ui/icons';
import { Spinner } from '@restate/ui/loading';
import { Section, SectionContent, SectionTitle } from '@restate/ui/section';
import { Actions } from './Actions';
import { JournalV2 } from './JournalV2';
import { useRestateContext } from '@restate/features/restate-context';
import { InvocationPageProvider } from './InvocationPageContext';
import { WorkflowKeySection } from './WorkflowKeySection';
import { tv } from 'tailwind-variants';

const metadataContainerStyles = tv({
  base: 'mt-6 rounded-xl grid grid-cols-1 md:grid-cols-2 gap-2 gap-y-4',
  variants: {
    isVirtualObject: {
      true: 'lg:grid-cols-2 3xl:grid-cols-4',
      false: '',
    },
  },
});
const lastFailureContainer = tv({
  base: 'min-w-0 p-0 md:col-span-2 rounded-xl border bg-gray-200/50 rounded-xl 3xl:col-span-4',
  variants: {
    isVirtualObject: {
      true: '',
      false: '',
    },
  },
});

function Component() {
  const { id } = useParams<{ id: string }>();
  const {
    data: journalAndInvocationData,
    isPending,
    error,
  } = useGetInvocationJournalWithInvocationV2(String(id), {
    refetchOnMount: true,
    staleTime: 0,
  });

  const { baseUrl } = useRestateContext();

  if (isPending) {
    return <Spinner />;
  }
  if (error) {
    return <ErrorBanner error={error} />;
  }

  const lastError = getRestateError(journalAndInvocationData);
  const shouldShowFailure = Boolean(lastError);
  const hasStack = lastError?.message.includes('\n');
  const isFailed = journalAndInvocationData?.status === 'failed';

  const isVirtualObject =
    journalAndInvocationData?.target_service_ty === 'virtual_object';

  return (
    <InvocationPageProvider isInInvocationPage>
      <div className="flex flex-col">
        <div className="flex flex-col gap-1 @container">
          <Link
            className="flex items-center gap-1 text-sm text-gray-500"
            variant="secondary"
            href={`${baseUrl}/invocations${window.location.search}`}
          >
            <Icon name={IconName.ArrowLeft} className="w-4 h-4 mt-0.5" />{' '}
            Invocations
          </Link>
          <div className="flex @2xl:flex-row flex-col gap-x-2 gap-y-1.5 @2xl:items-center relative ">
            <h1 className="text-lg flex items-center font-semibold font-mono pb-1 text-gray-900 sm:text-lg max-w-[20ch] truncate gap-1">
              <div className="mr-1.5 shrink-0 bg-white border rounded-xl shadow-sm ">
                <Icon
                  name={IconName.Invocation}
                  className="w-8 h-8 fill-blue-50 text-blue-400 drop-shadow-md p-1.5"
                />
              </div>

              <TruncateWithTooltip>{id}</TruncateWithTooltip>
            </h1>
            {journalAndInvocationData && (
              <div className="[&>*]:scale-[1.1] [&>*]:[transform-origin:center_left] ">
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

        <div className={metadataContainerStyles({ isVirtualObject })}>
          <KeysIdsSection
            invocation={journalAndInvocationData}
            className="p-0 rounded-xl border bg-gray-200/50 h-fit  [&>*:last-child]:border-white/50 [&>*:last-child]:rounded-xl [&>*:last-child]:border-white/50 [&>*:last-child]:bg-gradient-to-b [&>*:last-child]:to-gray-50/80 [&>*:last-child]:from-gray-50  [&>*:last-child]:shadow-zinc-800/[0.03]"
          />
          <DeploymentSection
            invocation={journalAndInvocationData}
            className="p-0 rounded-xl border h-fit bg-gray-200/50  [&>*:last-child]:border-white/50 [&>*:last-child]:rounded-xl [&>*:last-child]:border-white/50 [&>*:last-child]:bg-gradient-to-b [&>*:last-child]:to-gray-50/80 [&>*:last-child]:from-gray-50  [&>*:last-child]:shadow-zinc-800/[0.03]"
            raised
          />
          <VirtualObjectSection
            invocation={journalAndInvocationData}
            raised
            className="contents [&>*:last-child>h3]:mt-0 [&>*]:rounded-xl  [&>*]:border [&>*]:h-fit [&>*]:bg-gray-200/50  [&>*>*:last-child]:rounded-xl  [&>*>*:last-child]:border-white/50 [&>*>*:last-child]:rounded-xl [&>*>*:last-child]:border-white/50 [&>*>*:last-child]:bg-gradient-to-b [&>*>*:last-child]:to-gray-50/80 [&>*>*:last-child]:from-gray-50  [&>*>*:last-child]:shadow-zinc-800/[0.03]"
          />
          <WorkflowKeySection
            invocation={journalAndInvocationData}
            raised
            className="contents [&>*:last-child>h3]:mt-0 [&>*]:rounded-xl  [&>*]:border [&>*]:h-fit [&>*]:bg-gray-200/50  [&>*>*:last-child]:rounded-xl  [&>*>*:last-child]:border-white/50 [&>*>*:last-child]:rounded-xl [&>*>*:last-child]:border-white/50 [&>*>*:last-child]:bg-gradient-to-b [&>*>*:last-child]:to-gray-50/80 [&>*>*:last-child]:from-gray-50  [&>*>*:last-child]:shadow-zinc-800/[0.03]"
          />
          {shouldShowFailure && (
            <Section className={lastFailureContainer({ isVirtualObject })}>
              <SectionTitle>
                {isFailed ? 'Completion failure' : 'Last failure'}
              </SectionTitle>
              <SectionContent className="flex-auto rounded-xl border-white/50 rounded-xl bg-gradient-to-b to-gray-50/80 from-gray-50 shadow-zinc-800/[0.03]">
                <ErrorBanner
                  error={lastError}
                  open={false}
                  wrap={hasStack}
                  className="bg-transparent p-0 [&_code]:bg-gray-200/50 h-full [&_details]:max-h-full"
                />
              </SectionContent>
            </Section>
          )}
        </div>

        <div className="flex flex-col mt-24 ">
          <div className="rounded-2xl border bg-gray-200/50 relative">
            <JournalV2 invocationId={String(id)} />
          </div>
        </div>
      </div>
    </InvocationPageProvider>
  );
}
export const invocation = { Component };
