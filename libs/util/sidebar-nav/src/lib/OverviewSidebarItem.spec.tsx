import { render } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import type {
  SidebarLocation,
  SidebarMatch,
  SidebarSubItem,
} from '@restate/ui-layout';
import { OverviewSidebarItem } from './OverviewSidebarItem';

const navItem = vi.hoisted(() => ({
  props: undefined as
    | { match: SidebarMatch; subItems: SidebarSubItem[] }
    | undefined,
}));

vi.mock('@restate/ui-layout', () => ({
  SidebarNavItem: (props: {
    match: SidebarMatch;
    subItems: SidebarSubItem[];
  }) => {
    navItem.props = props;
    return null;
  },
}));

vi.mock('@restate/ui-icons', () => ({
  IconName: { House: 'house', Plus: 'plus' },
}));

vi.mock('@restate/ui-tooltip', () => ({
  HoverTooltip: () => null,
  TruncateMiddle: () => null,
}));

vi.mock('@restate/features-deployment', () => ({
  useDeploymentLabel: () => ({ isPending: false }),
}));

vi.mock('@restate/features-register-deployment', () => ({
  REGISTER_DEPLOYMENT_QUERY: 'registerDeployment',
}));

vi.mock('@restate/features-service', () => ({
  ServicePlaygroundSidebarAction: () => null,
}));

vi.mock('@restate/util-panel', () => ({
  HANDLER_QUERY_PARAM: 'handler',
  serviceHref: () => '',
  deploymentHref: () => '',
}));

function at(url: string): SidebarLocation {
  const { pathname, searchParams } = new URL(url, 'http://localhost');
  return { pathname, searchParams };
}

function renderItem(
  subItems?: ComponentProps<typeof OverviewSidebarItem>['subItems'],
) {
  render(
    <MemoryRouter initialEntries={['/env/overview']}>
      <OverviewSidebarItem baseUrl="/env" subItems={subItems} />
    </MemoryRouter>,
  );
  if (!navItem.props) {
    throw new Error('SidebarNavItem was not rendered');
  }
  return navItem.props;
}

function matches(item: SidebarSubItem | undefined, url: string) {
  return Boolean(item?.match?.(at(url)));
}

describe('OverviewSidebarItem', () => {
  it('lists Services and Deployments', () => {
    const { subItems } = renderItem();

    expect(subItems.map((item) => item.label)).toEqual([
      'Services',
      'Deployments',
    ]);
  });

  it('adds the given sub-items after Deployments', () => {
    const { subItems } = renderItem([
      {
        href: '/env/overview/guide',
        label: 'Guide',
        match: ({ pathname }) => pathname === '/env/overview/guide',
      },
    ]);

    expect(subItems.map((item) => item.label)).toEqual([
      'Services',
      'Deployments',
      'Guide',
    ]);
  });

  it('matches Services and Deployments only on the overview page', () => {
    const [services, deployments] = renderItem().subItems;

    expect(matches(services, '/env/overview')).toBe(true);
    expect(matches(services, '/env/overview?view=services')).toBe(true);
    expect(matches(deployments, '/env/overview?view=deployments')).toBe(true);
    expect(matches(services, '/env/overview/guide')).toBe(false);
    expect(matches(deployments, '/env/overview/guide?view=deployments')).toBe(
      false,
    );
  });

  it('stays active on a sub-item outside the overview path', () => {
    const { match } = renderItem([
      {
        href: '/env/guide',
        label: 'Guide',
        match: ({ pathname }) => pathname === '/env/guide',
      },
    ]);

    expect(match(at('/env/guide'))).toBe(true);
    expect(match(at('/env/invocations'))).toBe(false);
  });
});
