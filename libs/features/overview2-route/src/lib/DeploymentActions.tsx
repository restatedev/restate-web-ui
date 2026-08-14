import { PRUNE_DRAINED_DEPLOYMENTS_QUERY } from '@restate/features/prune-deployments';
import {
  REGISTER_DEPLOYMENT_QUERY,
  TriggerRegisterDeploymentDialog,
} from '@restate/features/register-deployment';
import { DropdownItem } from '@restate/ui/dropdown';
import { Icon, IconName } from '@restate/ui/icons';
import { SplitButton } from '@restate/ui/split-button';
import { useSearchParams } from 'react-router';
import { OVERVIEW_MODE_PARAM } from './overviewMode';

export function DeploymentActions() {
  const [, setSearchParams] = useSearchParams();

  return (
    <SplitButton
      mini={false}
      variant="primary"
      className="shrink-0 text-0.5xs"
      splitClassName="w-7 rounded-r-lg px-1 w-6 py-0.5"
      onSelect={(key) => {
        if (key === PRUNE_DRAINED_DEPLOYMENTS_QUERY) {
          setSearchParams(
            (prev) => {
              prev.set(OVERVIEW_MODE_PARAM, 'deployments');
              prev.set(PRUNE_DRAINED_DEPLOYMENTS_QUERY, 'true');
              return prev;
            },
            { preventScrollReset: true },
          );
        }
      }}
      menus={
        <>
          <DropdownItem href={`?${REGISTER_DEPLOYMENT_QUERY}=true`}>
            <Icon name={IconName.Plus} className="h-3.5 w-3.5 shrink-0" />
            Register deployment
          </DropdownItem>
          <DropdownItem value={PRUNE_DRAINED_DEPLOYMENTS_QUERY} destructive>
            <Icon name={IconName.Trash} className="h-3.5 w-3.5 shrink-0" />
            Prune drained deployments
          </DropdownItem>
        </>
      }
    >
      <TriggerRegisterDeploymentDialog
        variant="button"
        className="-mr-px shrink-0 justify-center rounded-l-lg rounded-r-none py-0.5 pr-2 pl-1.5 [&_svg]:h-3.5 [&_svg]:w-3.5"
      >
        Deployment
      </TriggerRegisterDeploymentDialog>
    </SplitButton>
  );
}
