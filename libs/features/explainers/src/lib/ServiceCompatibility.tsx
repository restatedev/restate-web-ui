import { InlineTooltip } from '@restate/ui/tooltip';
import { ComponentProps, PropsWithChildren } from 'react';

export function ServiceCompatibility({
  children,
  variant,
}: PropsWithChildren<{
  variant?: ComponentProps<typeof InlineTooltip>['variant'];
}>) {
  return (
    <InlineTooltip
      title="Service Compatibility"
      variant={variant}
      description={
        <p>
          Registered Restate services must use an SDK compatible with the
          service protocol version(s) of the running Restate server. Note that
          Restate SDKs follow independent versioning from the server.
        </p>
      }
      learnMoreHref="https://docs.restate.dev/operate/upgrading/#service-compatibility"
    >
      {children}
    </InlineTooltip>
  );
}
