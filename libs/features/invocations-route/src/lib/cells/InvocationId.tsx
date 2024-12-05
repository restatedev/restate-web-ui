import { useRef } from 'react';
import { CellProps } from './types';
import { Icon, IconName } from '@restate/ui/icons';
import { TruncateWithTooltip } from '@restate/ui/tooltip';
import { Link } from '@restate/ui/link';

export function InvocationId({ invocation }: CellProps) {
  const linkRef = useRef<HTMLAnchorElement>(null);

  return (
    <div className="relative ">
      <div className="inline-flex items-center w-full align-middle text-zinc-600 p-px">
        <div className="mr-1.5 shrink-0 h-6 w-6 bg-white border shadow-sm rounded-lg">
          <Icon
            name={IconName.Invocation}
            className="w-full h-full text-zinc-500 p-1"
          />
        </div>
        <TruncateWithTooltip copyText={invocation.id} triggerRef={linkRef}>
          {invocation.id}
        </TruncateWithTooltip>
        <Link
          ref={linkRef}
          href="?a=b"
          aria-label={invocation.id}
          variant="secondary"
          className="outline-offset-0 m-0.5 ml-0 rounded-full before:rounded-lg before:absolute before:inset-0 before:content-[''] hover:before:bg-black/[0.03] pressed:before:bg-black/5"
        >
          <Icon
            name={IconName.ChevronRight}
            className="w-4 h-4 text-gray-500 shrink-0 "
          />
        </Link>
      </div>
    </div>
  );
}
