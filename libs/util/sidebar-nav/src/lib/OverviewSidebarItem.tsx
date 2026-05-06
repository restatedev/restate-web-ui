import { SidebarNavItem, type SidebarMatch } from '@restate/ui/layout';
import { IconName } from '@restate/ui/icons';

interface OverviewSidebarItemProps {
  baseUrl?: string;
  disabled?: boolean;
}

export function OverviewSidebarItem({
  baseUrl = '',
  disabled,
}: OverviewSidebarItemProps) {
  const path = `${baseUrl}/overview`;
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
      preserveSearchParams
      disabled={disabled}
      subItems={[
        {
          href: path,
          label: 'Services',
          match: servicesMatch,
          preserveSearchParams: true,
        },
        {
          href: `${path}?view=deployments`,
          label: 'Deployments',
          match: deploymentsMatch,
          preserveSearchParams: true,
        },
      ]}
    />
  );
}
