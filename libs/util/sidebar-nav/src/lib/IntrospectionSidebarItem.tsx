import { SidebarNavItem } from '@restate/ui/layout';
import { IconName } from '@restate/ui/icons';

interface IntrospectionSidebarItemProps {
  baseUrl?: string;
  disabled?: boolean;
}

export function IntrospectionSidebarItem({
  baseUrl = '',
  disabled,
}: IntrospectionSidebarItemProps) {
  return (
    <SidebarNavItem
      href={`${baseUrl}/introspection`}
      icon={IconName.ScanSearch}
      label="Introspection"
      preserveSearchParams
      disabled={disabled}
    />
  );
}
