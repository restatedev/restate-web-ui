import type { ReactNode } from 'react';
import { useGetInvocation } from '@restate/data-access/admin-api-hooks';
import { Copy } from '@restate/ui/copy';
import { DropdownSection } from '@restate/ui/dropdown';
import { Spinner } from '@restate/ui/loading';
import { ServiceTarget } from '@restate/features/service-target';
import { Status } from './Status';

interface InvocationPopoverContentProps {
  id: string;
  title?: ReactNode;
}

export function InvocationPopoverContent({
  id,
  title,
}: InvocationPopoverContentProps) {
  const { data: invocation, isPending } = useGetInvocation(id, {
    refetchOnMount: 'always',
  });
  return (
    <div className="min-w-0">
      <DropdownSection
        title={
          <span className="flex min-w-0 items-center gap-1.5">
            {title ?? (
              <span className="truncate font-mono text-xs font-medium text-zinc-600">
                {id}
              </span>
            )}
            <Copy
              copyText={id}
              className="s ml-0 h-5 w-5 shrink-0 rounded-md p-1 text-gray-700"
            />
          </span>
        }
      >
        <div className="flex flex-wrap items-start gap-x-2 gap-y-3 px-3 py-2.5">
          {isPending ? (
            <div className="flex min-h-6 w-full items-center justify-center gap-1.5 text-xs text-zinc-500">
              <Spinner className="h-4 w-4" />
              Loading…
            </div>
          ) : invocation ? (
            <>
              <ServiceTarget
                scope={invocation.scope}
                service={invocation.target_service_name}
                serviceKey={invocation.target_service_key}
                handler={invocation.target_handler_name}
                serviceType={invocation.target_service_ty}
                className="max-w-full flex-none"
              />
              <Status invocation={invocation} />
            </>
          ) : null}
        </div>
      </DropdownSection>
    </div>
  );
}
