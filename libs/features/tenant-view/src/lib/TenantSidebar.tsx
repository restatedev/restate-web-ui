import { useRestateContext } from '@restate/features/restate-context';
import type { ReactNode } from 'react';
import type { TenantInvocationsProps } from './TenantInvocations';
import { IconName, Restate } from '@restate/ui/icons';
import { SidebarHeader, SidebarNav, SidebarNavItem } from '@restate/ui/layout';

export interface TenantSidebarProps extends TenantInvocationsProps {
  header?: ReactNode;
}

export function TenantSidebar({ scope, header }: TenantSidebarProps) {
  const { baseUrl } = useRestateContext();
  return (
    <>
      <SidebarHeader>
        {header ?? (
          <div className="flex h-14 min-w-0 items-center gap-2 px-2">
            <span className="shrink-0">
              <Restate />
            </span>
            <span className="truncate text-sm font-medium text-zinc-700 group-data-[collapsed=true]/sidebar:hidden">
              {scope}
            </span>
          </div>
        )}
      </SidebarHeader>
      <SidebarNav>
        <SidebarNavItem
          href={`${baseUrl.replace(/\/+$/, '')}/invocations`}
          icon={IconName.Invocation}
          label="Invocations"
          preserveSearchParams={false}
        />
      </SidebarNav>
    </>
  );
}
