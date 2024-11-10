import { useListDeployments } from '@restate/data-access/admin-api';
import { Icon, IconName } from '@restate/ui/icons';
import { tv } from 'tailwind-variants';
import { Deployment } from './Deployment';
import { TruncateWithTooltip } from '@restate/ui/tooltip';
import { Link } from '@restate/ui/link';
import { SERVICE_QUERY_PARAM } from './constants';
import { useSearchParams } from '@remix-run/react';

const styles = tv({
  base: 'w-full rounded-2xl p2-0.5 pt2-1 border shadow-zinc-800/[0.03] transform transition',
  variants: {
    isSelected: {
      true: 'bg-white shadow-md scale-110',
      false: 'bg-gradient-to-b to-gray-50/50 from-gray-50 shadow-sm scale-100',
    },
  },
});

export function Service({
  className,
  serviceName,
}: {
  serviceName: string;
  className?: string;
}) {
  const { data: { services } = {} } = useListDeployments();
  const service = services?.get(serviceName);
  const serviceDeployments = service?.deployments;
  const revisions = service?.sortedRevisions ?? [];

  const [searchParams] = useSearchParams();
  const isSelected = searchParams.get(SERVICE_QUERY_PARAM) === serviceName;

  return (
    <div className={styles({ className, isSelected })}>
      <div className="relative p-2 w-full rounded-[calc(0.75rem-0.125rem)] flex items-center gap-2 flex-row text-sm">
        <div className="h-8 w-8 shrink-0">
          <div className="rounded-lg bg-white border shadow-sm text-blue-400 h-full w-full flex items-center justify-center">
            <Icon
              name={IconName.Box}
              className="w-full h-full p-1.5 fill-blue-50 text-blue-400 drop-shadow-md"
            />
          </div>
        </div>
        <div className="flex flex-row gap-1 items-center font-medium text-sm text-zinc-600 min-w-0">
          <TruncateWithTooltip copyText={serviceName}>
            {serviceName}
          </TruncateWithTooltip>
          <Link
            aria-label={serviceName}
            variant="secondary"
            href={`?${SERVICE_QUERY_PARAM}=${serviceName}`}
            className="outline-offset-0 rounded-full before:absolute before:inset-0 before:content-[''] before:rounded-t-[0.9rem] hover:before:bg-black/[0.03] pressed:before:bg-black/5"
          >
            <Icon name={IconName.ChevronRight} className="w-4 h-4" />
          </Link>
        </div>
      </div>
      {revisions.length > 0 && (
        <div className="px-3 pb-3 pt-1 flex flex-col rounded-md rounded-t-sm gap-1">
          <div className="pl-1 uppercase text-2xs font-semibold text-gray-400 flex gap-2 items-center">
            Deployments
          </div>
          <div className="flex flex-col gap-1.5">
            {revisions.map((revision) => (
              <Deployment
                deploymentId={serviceDeployments?.[revision]}
                revision={revision}
                key={revision}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
