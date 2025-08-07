import { Icon, IconName } from '@restate/ui/icons';
import { tv } from 'tailwind-variants';
import { TruncateWithTooltip } from '@restate/ui/tooltip';
import { Service } from '@restate/data-access/admin-api';
import { Revision } from './Revision';
import { SERVICE_QUERY_PARAM } from './constants';
import { Link } from '@restate/ui/link';
import { useRef } from 'react';

const styles = tv({
  base: 'flex flex-row items-center gap-2 relative -m-1 p-1',
});

export function MiniService({
  className,
  service,
}: {
  className?: string;
  service: Service;
}) {
  const linkRef = useRef<HTMLAnchorElement>(null);

  return (
    <div className={styles({ className })}>
      <div className="h-6 w-6 shrink-0 rounded-md border bg-white shadow-xs">
        <Icon name={IconName.Box} className="h-full w-full p-1 text-zinc-400" />
      </div>

      <div className="flex flex-row items-center gap-1 truncate text-code font-medium text-zinc-600">
        <TruncateWithTooltip copyText={service.name} triggerRef={linkRef}>
          {service.name}
        </TruncateWithTooltip>
        <Link
          ref={linkRef}
          aria-label={service.name}
          variant="secondary"
          href={`?${SERVICE_QUERY_PARAM}=${service.name}`}
          className="m-1 ml-0 rounded-full outline-offset-0 before:absolute before:inset-0 before:rounded-lg before:content-[''] hover:before:bg-black/3 pressed:before:bg-black/5"
        >
          <Icon
            name={IconName.ChevronRight}
            className="h-4 w-4 text-gray-500"
          />
        </Link>
      </div>
      <Revision revision={service.revision} className="z-2 ml-auto" />
    </div>
  );
}
