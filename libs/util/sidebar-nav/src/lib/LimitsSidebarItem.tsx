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
      ]}
    />
  );
}
