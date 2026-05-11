import { Icon, IconName } from '@restate/ui/icons';
import { Nav, NavSearchItem } from '@restate/ui/nav';
import { OVERVIEW_MODE_PARAM } from './overviewMode';

export function OverviewModeToggle() {
  return (
    <Nav
      ariaCurrentValue="true"
      responsive={false}
      containerClassName="shrink-0 rounded-none border-0 bg-transparent shadow-none [&:has(:focus)]:border-0 [&:has(:focus)]:bg-transparent [&:has(:focus)]:shadow-none [&:has(:hover)]:border-0 [&:has(:hover)]:bg-transparent [&:has(:hover)]:shadow-none"
      indicatorClassName="hidden"
      className="h-9 gap-3 text-sm"
    >
      <NavSearchItem
        param={OVERVIEW_MODE_PARAM}
        className="flex h-9 items-center gap-1 rounded-none border-b-2 border-transparent px-1.5 py-0 text-sm font-medium text-gray-500 hover:!bg-transparent data-[active=true]:border-blue-600 data-[active=true]:text-gray-900 pressed:!bg-transparent"
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
        className="flex h-9 items-center gap-1 rounded-none border-b-2 border-transparent px-1.5 py-0 text-sm font-medium text-gray-500 hover:!bg-transparent data-[active=true]:border-blue-600 data-[active=true]:text-gray-900 pressed:!bg-transparent"
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
