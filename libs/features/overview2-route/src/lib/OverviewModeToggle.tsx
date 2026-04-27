import { Icon, IconName } from '@restate/ui/icons';
import { Nav, NavSearchItem } from '@restate/ui/nav';
import { OVERVIEW_MODE_PARAM } from './overviewMode';

export function OverviewModeToggle() {
  return (
    <Nav
      ariaCurrentValue="true"
      responsive={false}
      containerClassName="shrink-0 rounded-lg border-zinc-800/5 bg-black/3 shadow-[inset_0_1px_0px_0px_rgba(0,0,0,0.03)]"
      indicatorClassName="rounded-lg"
      className="gap-0 text-0.5xs"
    >
      <NavSearchItem
        param={OVERVIEW_MODE_PARAM}
        className="flex items-center gap-1 rounded-lg px-3 py-0.75 text-0.5xs data-[active=true]:text-gray-800"
      >
        <Icon
          name={IconName.Box}
          className="h-3 w-3 fill-gray-100 opacity-70"
        />
        Services
      </NavSearchItem>
      <NavSearchItem
        param={OVERVIEW_MODE_PARAM}
        value="deployments"
        className="flex items-center gap-1 rounded-lg px-3 py-0.75 text-0.5xs data-[active=true]:text-gray-800"
      >
        <Icon
          name={IconName.Http}
          className="h-3 w-3 fill-gray-100 opacity-70"
        />
        Deployments
      </NavSearchItem>
    </Nav>
  );
}
