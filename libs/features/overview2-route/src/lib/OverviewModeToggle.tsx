import { Icon, IconName } from '@restate/ui/icons';
import { Nav, NavSearchItem } from '@restate/ui/nav';
import { OVERVIEW_MODE_PARAM } from './overviewMode';
import { HoverTooltip } from '@restate/ui/tooltip';

export function OverviewModeToggle() {
  return (
    <div className="shrink-0 [&>div]:rounded-xl [&>div]:border-[0.5px] [&>div]:border-zinc-800/5 [&>div]:bg-black/3 [&>div]:shadow-[inset_0_1px_0px_0px_rgba(0,0,0,0.03)]">
      <Nav
        ariaCurrentValue="page"
        responsive={false}
        className="[&>[data-active=true]_svg]:fill-blue-50 [&>[data-active=true]_svg]:text-blue-400"
      >
        <NavSearchItem param={OVERVIEW_MODE_PARAM} className="group">
          <HoverTooltip content="Services">
            <Icon name={IconName.Box} className="icon fill-transparent p-0.5" />
            <span className="sr-only">Services</span>
          </HoverTooltip>
        </NavSearchItem>
        <NavSearchItem
          param={OVERVIEW_MODE_PARAM}
          value="deployments"
          className="group"
        >
          <HoverTooltip content="Deployments">
            <Icon
              name={IconName.Http}
              className="icon fill-transparent p-0.5"
            />
            <span className="sr-only">Deployments</span>
          </HoverTooltip>
        </NavSearchItem>
      </Nav>
    </div>
  );
}
