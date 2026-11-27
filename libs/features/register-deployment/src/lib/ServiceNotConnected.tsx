import { Callout } from '@restate/ui-callout';
import {
  Disclosure,
  DisclosurePanel,
  DisclosureTrigger,
} from '@restate/ui-disclosure';
import { ErrorBanner } from '@restate/ui-error';

export function ServiceNotConnected({
  tunnelName,
  submitLabel,
  error,
}: {
  tunnelName: string;
  submitLabel: string;
  error: Error;
}) {
  return (
    <Disclosure className="flex flex-col gap-2">
      <Callout intent="warning">
        No service is connected as {tunnelName} yet. Start it, wait for{' '}
        <code>Connected as "{tunnelName}"</code> in its logs, then click{' '}
        {submitLabel} again.{' '}
        <DisclosureTrigger variant="inline">Error details</DisclosureTrigger>
      </Callout>
      <DisclosurePanel>
        <ErrorBanner error={error} />
      </DisclosurePanel>
    </Disclosure>
  );
}
