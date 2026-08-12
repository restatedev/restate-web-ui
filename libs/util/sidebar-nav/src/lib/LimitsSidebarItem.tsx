import { IconName } from '@restate/ui/icons';
import { SidebarNavItem } from '@restate/ui/layout';

interface LimitsSidebarItemProps {
  baseUrl?: string;
  disabled?: boolean;
  preserveSearchParams?: boolean | string[];
}

export function LimitsSidebarItem({
  baseUrl = '',
  disabled,
  preserveSearchParams = true,
}: LimitsSidebarItemProps) {
  const rulesPath = `${baseUrl}/flow-control/rules`;
  const countersPath = `${baseUrl}/flow-control/counters`;
  return (
    <SidebarNavItem
      href={rulesPath}
      icon={IconName.Filters}
      label="Flow control"
      preserveSearchParams={preserveSearchParams}
      disabled={disabled}
      subItems={[
        {
          href: rulesPath,
          label: 'Rules',
          preserveSearchParams,
        },
        {
          href: countersPath,
          label: 'Limit counters',
          preserveSearchParams,
        },
      ]}
    />
  );
}
