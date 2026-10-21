import { useRestateContext } from '@restate/features-restate-context';
import type { ReactNode } from 'react';
import type { TenantInvocationsProps } from './TenantInvocations';
import { IconName, Restate } from '@restate/ui-icons';
import {
  SidebarHeader,
  SidebarNav,
  SidebarNavItem,
  type SidebarLocation,
} from '@restate/ui-layout';
import { OVERVIEW_MODE_PARAM } from '@restate/features-overview-route';

export interface TenantSidebarProps extends TenantInvocationsProps {
  header?: ReactNode;
}

function overviewMatcher(base: string, view: 'services' | 'deployments') {
  return ({ pathname, searchParams }: SidebarLocation) =>
    pathname.startsWith(`${base}/${view}`) ||
    (pathname === `${base}/overview` &&
      (searchParams.get(OVERVIEW_MODE_PARAM) === 'deployments') ===
        (view === 'deployments'));
}

export function TenantSidebar({ scope, header }: TenantSidebarProps) {
  const { baseUrl, schemaRegistryUrl, ingressMuxUrl } = useRestateContext();
  const base = baseUrl.replace(/\/+$/, '');
  return (
    <>
      <SidebarHeader>
        {header ?? (
          <div className="flex h-14 min-w-0 items-center gap-2 px-2">
            <span className="shrink-0">
              <Restate />
            </span>
            <span className="truncate text-sm font-medium text-secondary group-data-[collapsed=true]/sidebar:hidden">
              {scope}
            </span>
          </div>
        )}
      </SidebarHeader>
      <SidebarNav>
        <SidebarNavItem
          href={`${base}/invocations`}
          icon={IconName.Invocation}
          label="Invocations"
          preserveSearchParams={false}
        />
        {ingressMuxUrl && (
          <SidebarNavItem
            href={`${base}/crons`}
            icon={IconName.Timer}
            label="Crons"
            preserveSearchParams={false}
          />
        )}
        {schemaRegistryUrl && (
          <>
            <SidebarNavItem
              href={`${base}/overview?${OVERVIEW_MODE_PARAM}=services`}
              icon={IconName.Box}
              label="Services"
              preserveSearchParams={false}
              match={overviewMatcher(base, 'services')}
            />
            <SidebarNavItem
              href={`${base}/overview?${OVERVIEW_MODE_PARAM}=deployments`}
              icon={IconName.Http}
              label="Deployments"
              preserveSearchParams={false}
              match={overviewMatcher(base, 'deployments')}
            />
          </>
        )}
      </SidebarNav>
    </>
  );
}
