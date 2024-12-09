import { useRef } from 'react';
import { CellProps } from './types';
import { Icon, IconName } from '@restate/ui/icons';
import { TruncateWithTooltip } from '@restate/ui/tooltip';
import { Link } from '@restate/ui/link';
import { Invocation } from '@restate/data-access/admin-api';
import { tv } from 'tailwind-variants';

const styles = tv({
  base: 'relative text-zinc-600 font-mono',
  slots: {
    icon: 'mr-1.5 shrink-0 bg-white border rounded-lg',
    text: '',
    container: 'inline-flex items-center w-full align-middle',
    link: "text-zinc-500 outline-offset-0 ml-0 rounded-full  before:absolute before:inset-0 before:content-[''] hover:before:bg-black/[0.03] pressed:before:bg-black/5",
    linkIcon: 'text-current shrink-0',
  },
  variants: {
    size: {
      sm: {
        base: 'text-xs',
        icon: 'h-4 w-4 rounded [&>svg]:p-px bg-transparent border-none',
        text: 'text-2xs',
        link: 'before:rounded',
        container: '',
        linkIcon: 'w-3.5 h-3.5',
      },
      default: {
        base: '',
        icon: 'h-6 w-6 rounded-lg shadow-sm',
        text: '',
        link: 'before:rounded-lg m-0.5',
        container: 'p-px',
        linkIcon: 'w-4 h-4',
      },
    },
  },
  defaultVariants: {
    size: 'default',
  },
});
export function InvocationId({
  id,
  className,
  size = 'default',
}: {
  id: Invocation['id'];
  className?: string;
  size?: 'sm' | 'default';
}) {
  const linkRef = useRef<HTMLAnchorElement>(null);
  const { base, icon, text, link, container, linkIcon } = styles({ size });

  return (
    <div className={base({ className })}>
      <div className={container({})}>
        <div className={icon()}>
          <Icon
            name={IconName.Invocation}
            className="w-full h-full text-zinc-500 p-1"
          />
        </div>
        <TruncateWithTooltip copyText={id} triggerRef={linkRef}>
          <span className={text()}>{id}</span>
        </TruncateWithTooltip>
        <Link
          ref={linkRef}
          href="?a=b"
          aria-label={id}
          variant="secondary"
          className={link()}
        >
          <Icon name={IconName.ChevronRight} className={linkIcon()} />
        </Link>
      </div>
    </div>
  );
}

export function InvocationIdCell({ invocation }: CellProps) {
  return <InvocationId id={invocation.id} />;
}
