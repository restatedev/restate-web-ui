import { useGetInvocationJournalWithInvocation } from '@restate/data-access/admin-api';
import { ErrorBanner } from '@restate/ui/error';
import { useParams } from 'react-router';
import { getRestateError, Status } from './Status';
import { TruncateWithTooltip } from '@restate/ui/tooltip';
import { DeploymentSection } from './DeploymentSection';
import { VirtualObjectSection } from './VirtualObjectSection';
import { KeysIdsSection } from './KeysIdsSection';
import { tv } from 'tailwind-variants';
import { Link } from '@restate/ui/link';
import { Icon, IconName } from '@restate/ui/icons';
import { Spinner } from '@restate/ui/loading';
import { Section, SectionContent, SectionTitle } from '@restate/ui/section';
import { Actions } from './Actions';
import { JournalV2 } from './JournalV2';
import { useRestateContext } from '@restate/features/restate-context';
import { InvocationPageProvider } from './InvocationPageContext';

const itemsContainer = tv({
  base: 'flex gap-2 w-full [&>*]:flex-auto [&>*]:min-w-0 [&>*]:basis-1/2',
  variants: {
    withError: {
      true: 'flex-col',
      false: 'flex-col @2xl/all-cards:flex-row ',
    },
  },
});

const smCardsStyles = tv({
  base: 'flex flex-col gap-2 flex-auto [&>*]:basis-1/2 [&>*]:flex-auto [&>*]:min-2w-0 self-start w-full',
  variants: {
    isVirtualObject: {
      true: '',
      false: '@[687px]/sm-cards:flex-row',
    },
  },
});

function Component() {
  const { id } = useParams<{ id: string }>();
  const {
    data: journalAndInvocationData,
    isPending,
    error,
  } = useGetInvocationJournalWithInvocation(String(id), {
    refetchOnMount: true,
    staleTime: 0,
  });

  const invocation = journalAndInvocationData?.invocation;
  const { baseUrl } = useRestateContext();

  if (isPending) {
    return <Spinner />;
  }
  if (error) {
    return <ErrorBanner error={error} />;
  }

  const lastError = getRestateError(invocation);
  const shouldShowFailure = Boolean(lastError);
  const hasStack = lastError?.message.includes('\n');
  const isFailed = invocation?.status === 'failed';

  return (
    <InvocationPageProvider isInInvocationPage>
      <div className="flex flex-col">
        <div className="flex flex-col gap-1 @container">
          <Link
            className="flex items-center gap-1 text-sm"
            variant="secondary"
            href={`${baseUrl}/invocations${window.location.search}`}
          >
            <Icon name={IconName.ArrowLeft} className="w-4 h-4 mt-0.5" />{' '}
            Invocations
          </Link>
          <div className="flex @2xl:flex-row flex-col gap-x-2 gap-y-1.5 @2xl:items-center relative">
            <h1 className="text-lg flex items-center font-semibold tracking-tight text-gray-900 sm:text-xl max-w-[16ch] truncate">
              <div className="mr-1.5 shrink-0 bg-zinc-50 border rounded-lg">
                <Icon
                  name={IconName.Invocation}
                  className="w-6 h-6 text-zinc-500 p-1"
                />
              </div>

              <TruncateWithTooltip>{id}</TruncateWithTooltip>
            </h1>
            {invocation && <Status invocation={invocation} />}
            <div className="absolute right-0">
              <Actions
                invocation={invocation}
                mini={false}
                className="text-sm"
              />
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-2 mt-8 md:flex-row">
          <div className="@container/all-cards flex-auto">
            <div className={itemsContainer({ withError: shouldShowFailure })}>
              <div className="@container/sm-cards w-full">
                <div
                  className={smCardsStyles({
                    isVirtualObject:
                      invocation?.target_service_ty === 'virtual_object',
                  })}
                >
                  <KeysIdsSection invocation={invocation} />
                  <DeploymentSection invocation={invocation} raised />
                </div>
              </div>
              <VirtualObjectSection
                invocation={invocation}
                raised
                className=""
              />
            </div>
          </div>
          {shouldShowFailure && (
            <Section className="basis-4/6 min-w-0">
              <SectionTitle>
                {isFailed ? 'Completion failure' : 'Last failure'}
              </SectionTitle>
              <SectionContent className="flex-auto">
                <ErrorBanner
                  error={lastError}
                  wrap={hasStack}
                  className="bg-transparent p-0 [&_code]:bg-gray-200/50 h-full [&_details]:max-h-full"
                />
              </SectionContent>
            </Section>
          )}
        </div>
        <JournalV2 invocationId={String(id)} />
      </div>
    </InvocationPageProvider>
  );
}
export const invocation = { Component };
