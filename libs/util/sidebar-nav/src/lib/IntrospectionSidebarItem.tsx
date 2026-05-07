import { SidebarNavItem } from '@restate/ui/layout';
import { IconName } from '@restate/ui/icons';

interface IntrospectionSidebarItemProps {
  baseUrl?: string;
  disabled?: boolean;
  preserveSearchParams?: boolean | string[];
}

export function IntrospectionSidebarItem({
  baseUrl = '',
  disabled,
  preserveSearchParams = true,
}: IntrospectionSidebarItemProps) {
  return (
    <SidebarNavItem
      href={`${baseUrl}/introspection`}
      icon={IconName.ScanSearch}
      label="Introspection"
      preserveSearchParams={preserveSearchParams}
      disabled={disabled}
    />
  );
}
