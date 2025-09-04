import { InlineTooltip } from '@restate/ui/tooltip';
import { ComponentProps, PropsWithChildren } from 'react';

export function IngressAccessExplainer({
  children,
  variant,
  className,
}: PropsWithChildren<{
  variant?: ComponentProps<typeof InlineTooltip>['variant'];
  className?: string;
}>) {
  return (
    <InlineTooltip
      variant={variant}
      title="Service access"
      description={
        <p>
          Public services and their handlers are accessible via the ingress
          (HTTP or Kafka), while private services are accessible only from other
          Restate services.
        </p>
      }
      className={className}
      learnMoreHref="https://docs.restate.dev/operate/configuration/services/"
    >
      {children}
    </InlineTooltip>
  );
}
