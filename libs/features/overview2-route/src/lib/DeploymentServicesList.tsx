import { useRef } from 'react';
import { Link } from '@restate/ui/link';
import { Icon, IconName } from '@restate/ui/icons';
import { TruncateWithTooltip } from '@restate/ui/tooltip';
import { Revision } from '@restate/features/deployment';
import { SERVICE_QUERY_PARAM } from '@restate/features/service';
import type { OverviewDeploymentService } from './sortDeploymentServices';

export function DeploymentServicesList({
  services,
  className,
}: {
  services: OverviewDeploymentService[];
  className?: string;
}) {
  if (services.length === 0) return null;

  return (
    <div className={className}>
      {services.map((service) => (
        <DeploymentServiceItem
          key={`${service.name}-${service.revision}`}
          service={service}
        />
      ))}
    </div>
  );
}

function DeploymentServiceItem({
  service,
}: {
  service: OverviewDeploymentService;
}) {
  const linkRef = useRef<HTMLAnchorElement>(null);

  return (
    <div className="relative flex w-fit max-w-full items-center gap-2 rounded-lg px-1 py-0.5">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border bg-white shadow-xs">
        <Icon name={IconName.Box} className="h-full w-full p-1 text-zinc-400" />
      </div>
      <div className="flex max-w-full min-w-0 items-center gap-1.5 text-0.5xs font-medium text-zinc-600">
        <TruncateWithTooltip copyText={service.name} triggerRef={linkRef}>
          <span className="truncate">{service.name}</span>
        </TruncateWithTooltip>
        <Revision revision={service.revision} className="shrink-0" />
      </div>
      <Link
        ref={linkRef}
        aria-label={service.name}
        variant="secondary"
        href={`?${SERVICE_QUERY_PARAM}=${service.name}`}
        className="my-0.5 shrink-0 rounded-full before:absolute before:-top-0.5 before:-right-1 before:-bottom-0.5 before:-left-1 before:rounded-lg before:content-[''] hover:before:bg-black/3"
      >
        <Icon name={IconName.ChevronRight} className="h-4 w-4 text-gray-400" />
      </Link>
    </div>
  );
}
