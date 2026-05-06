import { SidebarNavItem } from '@restate/ui/layout';
import { IconName } from '@restate/ui/icons';

interface StateSidebarItemProps {
  baseUrl?: string;
  disabled?: boolean;
}

export function StateSidebarItem({
  baseUrl = '',
  disabled,
}: StateSidebarItemProps) {
  return (
    <SidebarNavItem
      href={`${baseUrl}/state`}
      icon={IconName.Database}
      label="State"
      preserveSearchParams
      disabled={disabled}
    />
  );
}
