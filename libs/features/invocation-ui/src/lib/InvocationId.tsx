import { type ReactNode, useRef } from 'react';
import { Icon, IconName } from '@restate/ui/icons';
import { HoverTooltip, TruncateWithTooltip } from '@restate/ui/tooltip';
import { Link } from '@restate/ui/link';
import { Invocation } from '@restate/data-access/admin-api-spec';
import { tv } from '@restate/util/styles';
import { getSearchParams, INVOCATION_QUERY_NAME } from '@restate/util/panel';
import { useActiveSidebarParam } from '@restate/ui/layout';
import { useLocation } from 'react-router';
import { useRestateContext } from '@restate/features/restate-context';
import {
  Popover,
  PopoverContent,
  PopoverHoverTrigger,
} from '@restate/ui/popover';
import { InvocationPopoverContent } from './InvocationPopoverContent';

const styles = tv({
  base: 'relative font-mono text-zinc-600',
  slots: {
    icon: 'mr-1.5 shrink-0 rounded-lg border bg-white',
    text: '',
    container: 'inline-flex w-full items-center align-middle',
    link: "ml-0 rounded-full text-zinc-500 outline-offset-0 before:absolute before:inset-0 before:content-[''] hover:before:bg-black/3 pressed:before:bg-black/5",
    linkIcon: 'shrink-0 text-current',
  },
  variants: {
    size: {
      sm: {
        base: 'text-xs',
        icon: 'h-4 w-4 rounded-sm border-none bg-transparent [&>svg]:p-px',
        text: 'text-2xs',
        link: 'before:rounded',
        container: '',
        linkIcon: 'h-3.5 w-3.5',
      },
      md: {
        base: 'text-2xs',
        icon: 'h-6 w-6 rounded-lg shadow-xs',
        text: 'text-2xs',
        link: 'before:rounded-lg',
        container: '',
        linkIcon: 'h-3.5 w-3.5',
      },
      default: {
        base: '',
        icon: 'h-6 w-6 rounded-lg shadow-xs',
        text: '',
        link: 'm-0.5 before:rounded-lg',
        container: 'p-px',
        linkIcon: 'h-4 w-4',
      },
      icon: {
        base: '',
        icon: 'mr-0 h-6 w-6 rounded-lg shadow-xs',
        text: 'w-0 text-2xs',
        link: 'absolute -inset-px m-0.5 rounded-lg before:rounded-lg',
        container: 'p-px',
        linkIcon: 'h-0 w-0',
      },
    },
  },
  defaultVariants: {
    size: 'default',
  },
});

interface InvocationIdProps {
  id: Invocation['id'];
  className?: string;
  iconName?: IconName;
  size?: 'sm' | 'default' | 'icon' | 'md';
  isLive?: boolean;
  truncateInMiddle?: boolean;
  popover?: boolean;
  title?: ReactNode;
}

export function InvocationId({
  id,
  className,
  iconName = IconName.Invocation,
  size = 'default',
  truncateInMiddle = false,
  popover = true,
  title,
}: InvocationIdProps) {
  const linkRef = useRef<HTMLAnchorElement>(null);
  const { base, icon, text, link, container, linkIcon } = styles({ size });
  const invocationInSidebar = useActiveSidebarParam(INVOCATION_QUERY_NAME);
  const isSelected = invocationInSidebar === id;

  const { baseUrl } = useRestateContext();
  const isIcon = size === 'icon';
  const location = useLocation();
  const hasPopover = popover;

  const linkElement = (
    <Link
      ref={linkRef}
      href={`${baseUrl}/invocations/${id}${getSearchParams(location.search)}`}
      aria-label={id}
      variant="secondary"
      className={link()}
      data-invocation-selected={isSelected}
    >
      <Icon name={IconName.ChevronRight} className={linkIcon()} />
    </Link>
  );

  const idText = (
    <span className={text()}>
      {truncateInMiddle ? (
        <span>
          {id?.substring(0, 8)}…{id?.slice(-5)}
        </span>
      ) : (
        id
      )}
    </span>
  );

  const element = (
    <div className={base({ className })}>
      <div className={container({})}>
        <div className={icon()}>
          <Icon name={iconName} className="h-full w-full p-1 text-zinc-500" />
        </div>

        {!isIcon &&
          (hasPopover ? (
            <span className="min-w-0 truncate">{idText}</span>
          ) : (
            <TruncateWithTooltip
              copyText={id}
              triggerRef={linkRef}
              tooltipContent={id}
              alwaysShow={truncateInMiddle}
            >
              {idText}
            </TruncateWithTooltip>
          ))}

        {isIcon && !hasPopover ? (
          <HoverTooltip content={id} offset={20} className="static">
            {linkElement}
          </HoverTooltip>
        ) : (
          linkElement
        )}
      </div>
    </div>
  );

  if (hasPopover) {
    return (
      <Popover>
        <PopoverHoverTrigger>{element}</PopoverHoverTrigger>
        <PopoverContent
          placement="bottom"
          isNonModal
          className="w-[min(48rem,calc(100vw-1.5rem))]"
        >
          <InvocationPopoverContent id={id} title={title} />
        </PopoverContent>
      </Popover>
    );
  }
  return element;
}
