import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useState, type PropsWithChildren } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '@restate/ui-button';
import { EmptyState } from '@restate/ui-empty-state';
import { Icon, IconName, Restate } from '@restate/ui-icons';
import {
  ComplementaryClose,
  ComplementaryHeader,
  ComplementaryWithSearchParam,
  LayoutOutlet,
  LayoutProvider,
  LayoutZone,
  ListPageHeader,
  SidebarFooter,
  SidebarHeader,
  SidebarNav,
  SidebarNavItem,
  useSidebar,
} from '@restate/ui-layout';
import { Link } from '@restate/ui-link';
import { StatusDot } from '@restate/ui-loading';
import { Nav, NavItem } from '@restate/ui-nav';
import {
  HoverTooltip,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@restate/ui-tooltip';
import { tv } from '@restate/util-styles';

const meta = {
  title: 'Layout/AppLayout',
  component: LayoutProvider,
} satisfies Meta<typeof LayoutProvider>;

export default meta;
type Story = StoryObj<typeof meta>;

const shell = {
  layout: 'fullscreen',
  docs: { story: { inline: false, height: '620px' } },
} satisfies Story['parameters'];

function At({ to, children }: PropsWithChildren<{ to: string }>) {
  const navigate = useNavigate();
  const [isReady, setIsReady] = useState(false);
  useEffect(() => {
    navigate(to, { replace: true });
    setIsReady(true);
  }, [navigate, to]);
  return isReady ? children : null;
}

function SidebarHeaderContent() {
  return (
    <>
      <Restate className="shrink-0 transition-[width,height,transform] duration-300 group-data-[collapsed=false]/sidebar:h-[1.5em] group-data-[collapsed=false]/sidebar:w-[1.5em] group-data-[collapsed=false]/sidebar:translate-x-0 group-data-[collapsed=true]/sidebar:h-[1.75em] group-data-[collapsed=true]/sidebar:w-[1.75em] group-data-[collapsed=true]/sidebar:translate-x-[2px] max-xl:h-[1.75em] max-xl:w-[1.75em] max-xl:translate-x-[2px]" />
      <div className="flex max-h-20 max-w-full min-w-0 flex-1 flex-col items-start gap-0 overflow-hidden opacity-100 transition-[max-width,max-height,opacity] duration-300 group-data-[collapsed=false]/sidebar:max-h-20 group-data-[collapsed=false]/sidebar:max-w-full group-data-[collapsed=false]/sidebar:opacity-100 group-data-[collapsed=true]/sidebar:max-h-0 group-data-[collapsed=true]/sidebar:max-w-0 group-data-[collapsed=true]/sidebar:opacity-0 max-xl:max-h-0 max-xl:max-w-0 max-xl:opacity-0">
        <div className="flex h-[1.5em] min-w-0 items-center gap-1.5 self-stretch pl-1">
          <StatusDot intent="success" pulse label="HEALTHY" />
          <span className="block min-w-0 flex-auto truncate text-sm font-medium text-secondary">
            Restate server
          </span>
        </div>
        <div className="-mt-1.5 pl-5">
          <span className="mt-0.5 items-center rounded-xl bg-surface/50 px-2 font-mono text-2xs leading-4 text-muted ring-1 ring-tint ring-inset">
            v1.8.1
          </span>
        </div>
      </div>
    </>
  );
}

const footerItemStyles = tv({
  slots: {
    item: 'flex w-full items-center gap-2 rounded-xl border border-transparent p-0.5 text-0.5xs text-muted no-underline outline-offset-2 outline-focus transition-all duration-300 group-data-[collapsed=false]/sidebar:w-full group-data-[collapsed=false]/sidebar:translate-x-0 group-data-[collapsed=false]/sidebar:gap-2 group-data-[collapsed=true]/sidebar:w-fit group-data-[collapsed=true]/sidebar:translate-x-[5px] group-data-[collapsed=true]/sidebar:gap-0 hover:bg-tint-subtle hover:text-secondary focus-visible:outline-2 max-xl:w-fit max-xl:translate-x-[5px] max-xl:gap-0',
    iconBox: 'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
    icon: 'h-4.5 w-4.5 shrink-0 text-subtle',
    label:
      'max-w-full min-w-0 flex-auto truncate overflow-hidden pr-1 text-left opacity-100 transition-[max-width,opacity,padding] duration-300 group-data-[collapsed=false]/sidebar:max-w-full group-data-[collapsed=false]/sidebar:pr-1 group-data-[collapsed=false]/sidebar:opacity-100 group-data-[collapsed=true]/sidebar:max-w-0 group-data-[collapsed=true]/sidebar:pr-0 group-data-[collapsed=true]/sidebar:opacity-0 max-xl:max-w-0 max-xl:pr-0 max-xl:opacity-0',
  },
})();

const supportLinks = [
  {
    href: 'https://docs.restate.dev/',
    label: 'Documentation',
    icon: IconName.Docs,
  },
  {
    href: 'https://discord.gg/skW3AZ6uGd',
    label: 'Discord',
    icon: IconName.Discord,
  },
  {
    href: 'https://github.com/restatedev/restate/issues/new',
    label: 'Open Github issue',
    icon: IconName.Github,
  },
];

function SidebarFooterContent() {
  const { isCollapsed } = useSidebar();
  return (
    <div className="flex flex-col gap-0.5">
      {supportLinks.map((item) => (
        <HoverTooltip
          key={item.href}
          content={item.label}
          placement="right"
          disabled={!isCollapsed}
          offset={12}
        >
          <Link
            href={item.href}
            preserveQueryParams={false}
            target="_blank"
            rel="noreferrer noopener"
            className={footerItemStyles.item()}
          >
            <span className={footerItemStyles.iconBox()}>
              <Icon name={item.icon} className={footerItemStyles.icon()} />
            </span>
            <span className={footerItemStyles.label()}>{item.label}</span>
          </Link>
        </HoverTooltip>
      ))}
    </div>
  );
}

function SidebarPanels() {
  return (
    <>
      <SidebarHeader>
        <SidebarHeaderContent />
      </SidebarHeader>
      <SidebarNav>
        <SidebarNavItem
          href="/overview"
          icon={IconName.House}
          label="Overview"
          subItems={[
            { href: '/overview', label: 'Services' },
            { href: '/overview?view=deployments', label: 'Deployments' },
          ]}
        />
        <SidebarNavItem
          href="/invocations"
          icon={IconName.Invocation}
          label="Invocations"
        />
        <SidebarNavItem
          href="/workflows"
          icon={IconName.Workflow}
          label="Workflows"
        />
        <SidebarNavItem
          href="/virtual-objects"
          icon={IconName.VirtualObject}
          label="Virtual Objects"
        />
        <SidebarNavItem href="/state" icon={IconName.Database} label="State" />
        <SidebarNavItem
          href="/flow-control/rules"
          match={({ pathname }) => pathname.startsWith('/flow-control')}
          icon={IconName.FlowControl}
          label="Flow control"
          subItems={[
            { href: '/flow-control/rules', label: 'Rules' },
            { href: '/flow-control/counters', label: 'Limit counters' },
            { href: '/flow-control/vqueues', label: 'VQueues' },
          ]}
        />
        <SidebarNavItem
          href="/introspection"
          icon={IconName.ScanSearch}
          label="Introspection"
          autoExpandSubItems={false}
          extraSubItems={[{ href: '/query-stats', label: 'Query inspector' }]}
        />
      </SidebarNav>
      <SidebarFooter>
        <SidebarFooterContent />
      </SidebarFooter>
    </>
  );
}

function StatePage() {
  return (
    <LayoutOutlet zone={LayoutZone.Content}>
      <ListPageHeader icon={IconName.Database} title="State">
        Browse and manage the key/value state stored by your Virtual Objects and
        Workflows.
      </ListPageHeader>
      <EmptyState
        icon={IconName.Database}
        title="No state found"
        description={
          <>
            <Link
              href="https://docs.restate.dev/foundations/services#virtual-object"
              variant="secondary"
              target="_blank"
              rel="noopener noreferrer"
            >
              Learn more
            </Link>{' '}
            how you can use State in Restate.
          </>
        }
      />
    </LayoutOutlet>
  );
}

export const Sidebar: Story = {
  parameters: shell,
  render: () => (
    <LayoutProvider>
      <At to="/state">
        <SidebarPanels />
        <StatePage />
      </At>
    </LayoutProvider>
  ),
};

function HeaderButton({ label, icon }: { label: string; icon: IconName }) {
  return (
    <Tooltip>
      <TooltipTrigger>
        <Button
          variant="secondary"
          aria-label={label}
          className="flex h-7 w-7 items-center justify-center rounded-full p-0"
        >
          <Icon name={icon} size="sm" />
        </Button>
      </TooltipTrigger>
      <TooltipContent size="sm">{label}</TooltipContent>
    </Tooltip>
  );
}

function PlaygroundPanel() {
  return (
    <ComplementaryWithSearchParam paramName="playground">
      <ComplementaryHeader>
        <HeaderButton label="Open as sheet" icon={IconName.Maximize} />
        <HeaderButton label="Refresh" icon={IconName.Retry} />
        <ComplementaryClose>
          <HeaderButton label="Close" icon={IconName.X} />
        </ComplementaryClose>
      </ComplementaryHeader>
      <EmptyState
        icon={IconName.PlayOff}
        title="No playground"
        description="Only other services can call Checkout."
      />
    </ComplementaryWithSearchParam>
  );
}

export const SidePanel: Story = {
  parameters: shell,
  render: () => (
    <LayoutProvider>
      <At to="/state?panel=playground&playground=Checkout">
        <SidebarPanels />
        <StatePage />
        <PlaygroundPanel />
      </At>
    </LayoutProvider>
  ),
};

const navItems = [
  { href: '/overview', label: 'Overview' },
  { href: '/invocations', label: 'Invocations' },
  { href: '/workflows', label: 'Workflows' },
  { href: '/virtual-objects', label: 'Virtual Objects' },
  { href: '/state', label: 'State' },
  { href: '/flow-control/rules', label: 'Flow control' },
  { href: '/introspection', label: 'Introspection' },
];

function TopbarPanels() {
  return (
    <LayoutOutlet zone={LayoutZone.AppBar}>
      <div className="flex min-w-0 flex-1 items-stretch gap-1">
        <div className="border1 bg1-white shadow2-xs flex h-full items-center gap-2 rounded-xl p-3 pr-0">
          <Restate />
        </div>
        <Button
          variant="secondary"
          className="my-1 flex min-w-0 items-center gap-2 border-none bg-transparent px-2 shadow-none"
        >
          <div className="flex w-full items-center gap-2 truncate">
            <StatusDot intent="success" pulse label="HEALTHY" />
            <span className="block min-w-0 flex-auto truncate">
              Restate server
            </span>
            <span className="mt-0.5 items-center rounded-xl bg-surface/50 px-2 font-mono text-2xs leading-4 text-muted ring-1 ring-tint ring-inset">
              v1.8.1
            </span>
          </div>
        </Button>
        <LayoutOutlet zone={LayoutZone.Nav}>
          <Nav ariaCurrentValue="page">
            {navItems.map(({ href, label }) => (
              <NavItem key={href} href={href}>
                {label}
              </NavItem>
            ))}
          </Nav>
        </LayoutOutlet>
      </div>
    </LayoutOutlet>
  );
}

export const AppBar: Story = {
  parameters: shell,
  render: () => (
    <LayoutProvider variant="appbar">
      <At to="/state">
        <TopbarPanels />
        <StatePage />
      </At>
    </LayoutProvider>
  ),
};

export const PageHeader: Story = {
  parameters: { layout: 'padded' },
  render: () => (
    <ListPageHeader icon={IconName.Database} title="State">
      Browse and manage the key/value state stored by your Virtual Objects and
      Workflows.
    </ListPageHeader>
  ),
};
