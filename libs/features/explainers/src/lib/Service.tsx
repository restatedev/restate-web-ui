import { InlineTooltip } from '@restate/ui/tooltip';
import { PropsWithChildren } from 'react';

export function ServiceExplainer({ children }: PropsWithChildren<unknown>) {
  return (
    <InlineTooltip
      title="Service"
      description={
        <p>
          Your business logic lives in <strong>services:</strong> regular
          applications that embed the Restate SDK.
          <span className="mb-2 block" />
          Services contain handlers (durable functions) that process requests
          and execute business logic.
        </p>
      }
      learnMoreHref="https://docs.restate.dev/foundations/services"
    >
      {children}
    </InlineTooltip>
  );
}
