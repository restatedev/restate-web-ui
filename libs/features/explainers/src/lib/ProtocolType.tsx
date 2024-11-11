import { InlineTooltip } from '@restate/ui/tooltip';
import { ComponentProps, PropsWithChildren } from 'react';

export function ProtocolTypeExplainer({
  children,
  variant,
}: PropsWithChildren<{
  variant?: ComponentProps<typeof InlineTooltip>['variant'];
}>) {
  return (
    <InlineTooltip
      title="Protocol Type"
      variant={variant}
      description={
        <>
          <p>
            The communication between a service and Restate can occur through
            two distinct methods:
            <br />
          </p>
          <ul className="">
            <li>
              <code className="font-semibold">Request/Response:</code> At each
              suspension point, the SDK/service terminates the HTTP request, and
              the Restate runtime subsequently re-invokes the service when
              additional tasks arise.
            </li>
            <li className="mt-2">
              <code className="font-semibold">BidirectionalStream:</code> This
              method allows Restate to issue multiple simultaneous requests to
              the service without waiting for responses, thereby enhancing
              response times and reducing latencies.
            </li>
          </ul>
        </>
      }
      learnMoreHref="https://docs.restate.dev/develop/ts/serving/#creating-a-fetch-handler"
    >
      {children}
    </InlineTooltip>
  );
}
