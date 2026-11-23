import { Button } from '@restate/ui-button';
import { ErrorBanner } from '@restate/ui-error';
import { Icon, IconName } from '@restate/ui-icons';
import { Disclosure, DisclosurePanel } from 'react-aria-components';
import { Warning } from './Results';

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
      <Warning className="mt-0">
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
            className="h-3.5 w-3.5 group-expanded/details:rotate-180"
          />
        </Button>
      </Warning>
      <DisclosurePanel>
        <ErrorBanner error={error} />
      </DisclosurePanel>
    </Disclosure>
  );
}
