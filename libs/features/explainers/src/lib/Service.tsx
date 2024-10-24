import { InlineTooltip } from '@restate/ui/tooltip';
import { PropsWithChildren } from 'react';

export function ServiceExplainer({ children }: PropsWithChildren<unknown>) {
  return (
    <InlineTooltip
      title="Service"
      description={
        <p>
          Contain the handlers which process incoming requests. Services run
          like regular RPC services (e.g. a NodeJS app in a Docker container).
          Services can be written in any language for which there is an SDK
          available.
        </p>
      }
      learnMoreHref="https://docs.restate.dev/concepts/services#services-1"
    >
      {children}
    </InlineTooltip>
  );
}
