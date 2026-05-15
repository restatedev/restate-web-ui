import { SidebarNavItem, type SidebarMatch } from '@restate/ui/layout';
import { IconName } from '@restate/ui/icons';
import { useSearchParams } from 'react-router';

interface OverviewSidebarItemProps {
  baseUrl?: string;
  disabled?: boolean;
  preserveSearchParams?: boolean | string[];
}

export function OverviewSidebarItem({
  baseUrl = '',
  disabled,
  preserveSearchParams = true,
}: OverviewSidebarItemProps) {
  const path = `${baseUrl}/overview`;
  const [searchParams] = useSearchParams();
  const carryParams = new URLSearchParams(searchParams);
  carryParams.delete('view');
  Array.from(carryParams.keys()).forEach((key) => {
    if (
      key.startsWith('filter_') ||
      key.startsWith('sort_') ||
      key === 'column'
    ) {
      carryParams.delete(key);
    }
  });
  const carryQuery = carryParams.toString();
  const servicesHref = carryQuery ? `${path}?${carryQuery}` : path;
  const deploymentsHref = carryQuery
    ? `${path}?view=deployments&${carryQuery}`
    : `${path}?view=deployments`;

  const servicesMatch: SidebarMatch = (loc) => {
    if (!loc.pathname.startsWith(path)) return false;
    const view = loc.searchParams.get('view');
    return !view || view === 'services';
  };
  const deploymentsMatch: SidebarMatch = (loc) =>
    loc.pathname.startsWith(path) &&
    loc.searchParams.get('view') === 'deployments';

  return (
    <SidebarNavItem
      href={path}
      icon={IconName.House}
      label="Overview"
      preserveSearchParams={preserveSearchParams}
      disabled={disabled}
      subItems={[
        {
          href: servicesHref,
          label: 'Services',
          match: servicesMatch,
          preserveSearchParams,
        },
        {
          href: deploymentsHref,
          label: 'Deployments',
          match: deploymentsMatch,
          preserveSearchParams,
        },
      ]}
    />
  );
}
