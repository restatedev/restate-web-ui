import { Button } from '@restate/ui-button';
import { Callout } from '@restate/ui-callout';
import { ErrorBanner } from '@restate/ui-error';
import { Icon, IconName } from '@restate/ui-icons';
import { Disclosure, DisclosurePanel } from 'react-aria-components';

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
    <Disclosure className="group/details flex flex-col gap-2">
      <Callout intent="warning">
        No service is connected as {tunnelName} yet. Start it, wait for{' '}
        <code>Connected as "{tunnelName}"</code> in its logs, then click{' '}
        {submitLabel} again.{' '}
        <Button
          slot="trigger"
          variant="icon"
          className="inline-flex gap-0.5 rounded-md px-1 py-0 align-baseline text-0.5xs font-medium text-warning hover:bg-warning-muted pressed:bg-warning-emphasis"
        >
          Error details
          <Icon
            name={IconName.ChevronDown}
            size="sm"
            className="group-expanded/details:rotate-180"
          />
        </Button>
      </Callout>
      <DisclosurePanel>
        <ErrorBanner error={error} />
      </DisclosurePanel>
    </Disclosure>
  );
}
