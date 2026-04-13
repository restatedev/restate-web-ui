import {
  REGISTER_DEPLOYMENT_QUERY,
  TriggerRegisterDeploymentDialog,
} from '@restate/features/register-deployment';
import { DropdownItem } from '@restate/ui/dropdown';
import { Icon, IconName } from '@restate/ui/icons';
import { SplitButton } from '@restate/ui/split-button';

export function DeploymentActions() {
  return (
    <SplitButton
      mini={false}
      className="shrink-0 text-0.5xs"
      splitClassName="w-7 rounded-r-lg px-1.5 py-0.5"
      menus={
        <DropdownItem href={`?${REGISTER_DEPLOYMENT_QUERY}=true`}>
          <Icon name={IconName.Plus} className="h-3.5 w-3.5 shrink-0" />
          Register deployment
        </DropdownItem>
      }
    >
      <TriggerRegisterDeploymentDialog className="-mr-px shrink-0 justify-center rounded-l-lg rounded-r-none py-0.5 pr-2 pl-1.5 [&_svg]:h-3.5 [&_svg]:w-3.5">
        Deployment
      </TriggerRegisterDeploymentDialog>
    </SplitButton>
  );
}
