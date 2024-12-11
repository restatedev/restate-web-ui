import { Button } from '@restate/ui/button';
import {
  ComplementaryWithSearchParam,
  ComplementaryClose,
} from '@restate/ui/layout';
import { useSearchParams } from 'react-router';
import { INVOCATION_QUERY_NAME } from './constants';
import { useGetInvocation } from '@restate/data-access/admin-api';
import { Icon, IconName } from '@restate/ui/icons';
import { TruncateWithTooltip } from '@restate/ui/tooltip';
import { Section, SectionContent, SectionTitle } from '@restate/ui/section';
import { InvokedBy, ServiceHandler, Target } from './Target';
import { InvocationId } from './InvocationId';
import { Badge } from '@restate/ui/badge';
import { ServiceHandlerSection } from './ServiceHandlerSection';
import { InvokedBySection } from './InvokedBySection';

export function InvocationPanel() {
  const [searchParams] = useSearchParams();
  const invocationId = searchParams.get(INVOCATION_QUERY_NAME);
  const { data, isPending } = useGetInvocation(String(invocationId), {
    enabled: Boolean(invocationId),
    refetchOnMount: true,
  });
  if (!invocationId) {
    return null;
  }

  return (
    <ComplementaryWithSearchParam
      paramName={INVOCATION_QUERY_NAME}
      footer={
        <div className="flex gap-2 flex-col flex-auto">
          <div className="flex gap-2">
            <ComplementaryClose>
              <Button className="flex-auto grow-0 w-full" variant="secondary">
                Cancel
              </Button>
            </ComplementaryClose>
          </div>
        </div>
      }
    >
      <>
        <h2 className="mb-3 text-lg font-medium leading-6 text-gray-900 flex gap-2 items-center">
          <div className="h-10 w-10 shrink-0 text-blue-400">
            <Icon
              name={IconName.Invocation}
              className="w-full h-full p-1.5 fill-blue-50 text-blue-400 drop-shadow-md"
            />
          </div>{' '}
          <div className="flex flex-col items-start gap-1 min-w-0">
            {isPending ? (
              <>
                <div className="w-[16ch] h-5 animate-pulse rounded-md bg-gray-200 mt-1" />
                <div className="w-[8ch] h-5 animate-pulse rounded-md bg-gray-200" />
              </>
            ) : (
              <>
                Invocation
                <span className="text-sm text-gray-500 contents font-mono">
                  <TruncateWithTooltip>{data?.id}</TruncateWithTooltip>
                </span>
              </>
            )}
          </div>
        </h2>

        <ServiceHandlerSection className="mt-5" invocation={data} />
        <InvokedBySection className="mt-2" invocation={data} />
      </>
    </ComplementaryWithSearchParam>
  );
}
// deployment
// idempotency
// queue
// lifecycle + attempt count +  status
// trace id
// modified at
