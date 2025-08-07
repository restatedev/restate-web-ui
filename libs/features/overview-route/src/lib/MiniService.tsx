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
      <div className="shrink-0 h-6 w-6 bg-white border shadow-xs rounded-md">
        <Icon name={IconName.Box} className="w-full h-full text-zinc-400 p-1" />
      </div>

      <div className="flex flex-row gap-1 items-center font-medium text-code text-zinc-600 truncate">
        <TruncateWithTooltip copyText={service.name} triggerRef={linkRef}>
          {service.name}
        </TruncateWithTooltip>
        <Link
          ref={linkRef}
          aria-label={service.name}
          variant="secondary"
          href={`?${SERVICE_QUERY_PARAM}=${service.name}`}
          className="outline-offset-0 m-1 ml-0 rounded-full before:absolute before:inset-0 before:content-[''] before:rounded-lg hover:before:bg-black/3 pressed:before:bg-black/5"
        >
          <Icon
            name={IconName.ChevronRight}
            className="w-4 h-4 text-gray-500"
          />
        </Link>
      </div>
      <Revision revision={service.revision} className="ml-auto z-2" />
    </div>
  );
}
