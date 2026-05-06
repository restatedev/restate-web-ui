import { SidebarNavItem } from '@restate/ui/layout';
import { IconName } from '@restate/ui/icons';

interface StateSidebarItemProps {
  baseUrl?: string;
  disabled?: boolean;
  preserveSearchParams?: boolean | string[];
}

export function StateSidebarItem({
  baseUrl = '',
  disabled,
  preserveSearchParams = true,
}: StateSidebarItemProps) {
  return (
    <SidebarNavItem
      href={`${baseUrl}/state`}
      icon={IconName.Database}
      label="State"
      preserveSearchParams={preserveSearchParams}
      disabled={disabled}
    />
  );
}
