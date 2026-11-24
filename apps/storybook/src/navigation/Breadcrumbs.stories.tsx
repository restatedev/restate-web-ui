import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useState, type PropsWithChildren } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { userEvent, within } from 'storybook/test';
import {
  Breadcrumbs,
  BreadcrumbsProvider,
  CrumbContent,
  type BreadcrumbComponentProps,
  type PageDefinition,
} from '@restate/ui-breadcrumbs';
import { Chip, ChipGroup, ChipSegment } from '@restate/ui-chip';
import { Copy } from '@restate/ui-copy';
import { Header } from '@restate/ui-header';
import { Icon, IconName } from '@restate/ui-icons';

const meta = {
  title: 'Navigation/Breadcrumbs',
  component: Breadcrumbs,
  parameters: {
    layout: 'padded',
    docs: { story: { inline: false, height: '260px' } },
  },
} satisfies Meta<typeof Breadcrumbs>;

export default meta;
type Story = StoryObj<typeof meta>;

function CurrentCopy({ crumb }: BreadcrumbComponentProps) {
  return (
    crumb.isCurrent && <Copy copyText={crumb.label} size="2xs" tone="muted" />
  );
}

function InvocationCrumbContent({ crumb }: BreadcrumbComponentProps) {
  return (
    <>
      <CrumbContent crumb={crumb} />
      <CurrentCopy crumb={crumb} />
    </>
  );
}

function DeploymentCrumbContent({ crumb }: BreadcrumbComponentProps) {
  return (
    <>
      <CrumbContent crumb={{ ...crumb, label: 'localhost:9080' }} />
      <CurrentCopy crumb={crumb} />
    </>
  );
}

function VirtualObjectInstanceCrumbContent({
  crumb,
}: BreadcrumbComponentProps) {
  return (
    <>
      <span
        data-crumb-label
        className="flex min-w-0 items-center gap-1 truncate"
      >
        <span className="min-w-0 truncate">
          {crumb.params['service'] ?? ''}
        </span>
        <span className="shrink-0 text-subtle">/</span>
        <span className="min-w-0 truncate font-mono text-[90%]">
          {crumb.params['key'] ?? ''}
        </span>
      </span>
      <CurrentCopy crumb={crumb} />
    </>
  );
}

const pages: PageDefinition[] = [
  {
    pattern: '/overview',
    kind: 'list',
    resource: 'overview',
    label: 'Overview',
    icon: IconName.House,
  },
  {
    pattern: '/invocations',
    kind: 'list',
    resource: 'invocations',
    label: 'Invocations',
    icon: IconName.Invocation,
  },
  {
    pattern: '/invocations/:id',
    kind: 'detail',
    resource: 'invocations',
    label: (params) => params['id'] ?? '',
    icon: IconName.Invocation,
    Content: InvocationCrumbContent,
  },
  {
    pattern: '/virtual-objects',
    kind: 'list',
    resource: 'virtual-objects',
    label: 'Virtual Objects',
    icon: IconName.VirtualObject,
  },
  {
    pattern: '/virtual-objects/:service/:key',
    kind: 'detail',
    resource: 'virtual-objects',
    label: (params) => `${params['service'] ?? ''} / ${params['key'] ?? ''}`,
    icon: IconName.VirtualObject,
    Content: VirtualObjectInstanceCrumbContent,
  },
  {
    pattern: '/services',
    kind: 'list',
    resource: 'services',
    label: 'Services',
    icon: IconName.Box,
  },
  {
    pattern: '/services/:service',
    kind: 'detail',
    resource: 'services',
    label: (params) => params['service'] ?? '',
    icon: IconName.Box,
  },
  {
    pattern: '/deployments',
    kind: 'list',
    resource: 'deployments',
    label: 'Deployments',
    icon: IconName.Http,
  },
  {
    pattern: '/deployments/:deployment',
    kind: 'detail',
    resource: 'deployments',
    label: (params) => params['deployment'] ?? '',
    icon: IconName.Http,
    Content: DeploymentCrumbContent,
  },
];

const invocationId = 'inv_1gQNFQQ1HLWM7jo57gxCUiOlQ5nBYztfXV';
const deploymentId = 'dp_16SYzZL6LG4bkox94Wgq425';

const invocationTrail = ['/invocations', `/invocations/${invocationId}`];

const longTrail = [
  '/virtual-objects',
  '/virtual-objects/Cart/cart-1042',
  `/invocations/${invocationId}`,
  '/services/Checkout',
  `/deployments/${deploymentId}`,
];

function Trail({ steps, children }: PropsWithChildren<{ steps: string[] }>) {
  const navigate = useNavigate();
  const { key, pathname } = useLocation();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    navigate(steps[index] ?? '/');
  }, [index, navigate, steps]);

  useEffect(() => {
    if (pathname === steps[index] && index < steps.length - 1) {
      setIndex(index + 1);
    }
  }, [key, pathname, index, steps]);

  return <BreadcrumbsProvider pages={pages}>{children}</BreadcrumbsProvider>;
}

function Target() {
  return (
    <ChipGroup density="compact" className="min-w-0 flex-[0_1_auto]">
      <Chip left="straight" right="angled" size="lg">
        <ChipSegment tone="raised">
          <Icon name={IconName.Box} size="xs" />
          Checkout
        </ChipSegment>
      </Chip>
      <Chip left="angled" right="straight" size="lg">
        <ChipSegment tone="muted">process()</ChipSegment>
      </Chip>
    </ChipGroup>
  );
}

function InvocationHeader() {
  return (
    <div className="pt-4">
      <Header
        icon={IconName.Invocation}
        iconLabel="Invocation"
        trail={<Breadcrumbs variant="flat" />}
      >
        <Target />
      </Header>
    </div>
  );
}

export const Flat: Story = {
  render: () => (
    <Trail steps={invocationTrail}>
      <InvocationHeader />
    </Trail>
  ),
};

export const FlatCollapsed: Story = {
  parameters: { docs: { story: { inline: false, height: '360px' } } },
  render: () => (
    <Trail steps={longTrail}>
      <InvocationHeader />
    </Trail>
  ),
  play: async ({ canvasElement }) => {
    await new Promise((resolve) => setTimeout(resolve, 600));
    await userEvent.click(
      within(canvasElement).getByRole('button', { name: /more pages/ }),
    );
  },
};

export const Chips: Story = {
  render: () => (
    <Trail steps={invocationTrail}>
      <div className="flex flex-col pt-4">
        <Breadcrumbs className="mt-8 px-5 md:mt-0" />
      </div>
    </Trail>
  ),
};

export const ChipsCollapsed: Story = {
  render: () => (
    <Trail steps={longTrail}>
      <div className="flex flex-col pt-4">
        <Breadcrumbs className="mt-8 px-5 md:mt-0" />
      </div>
    </Trail>
  ),
};
