import { useEffect, useRef, useState } from 'react';
import { Icon, IconName } from '@restate/ui/icons';
import { HoverTooltip, TruncateWithTooltip } from '@restate/ui/tooltip';
import { Link } from '@restate/ui/link';
import { Invocation } from '@restate/data-access/admin-api';
import { tv } from 'tailwind-variants';
import { INVOCATION_QUERY_NAME } from './constants';
import { useActiveSidebarParam } from '@restate/ui/layout';
import { useLocation } from 'react-router';
import { useRestateContext } from '@restate/features/restate-context';
import {
  DEPLOYMENT_QUERY_PARAM,
  SERVICE_PLAYGROUND_QUERY_PARAM,
  SERVICE_QUERY_PARAM,
} from '@restate/features/overview-route';
import { useIsInInvocationPage } from './InvocationPageContext';

const styles = tv({
  base: 'relative text-zinc-600 font-mono',
  slots: {
    icon: 'mr-1.5 shrink-0 bg-white border rounded-lg',
    text: '',
    container: 'inline-flex items-center w-full align-middle',
    link: "text-zinc-500 outline-offset-0 ml-0 rounded-full  before:absolute before:inset-0 before:content-[''] hover:before:bg-black/3 pressed:before:bg-black/5",
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
      md: {
        base: 'text-2xs',
        icon: 'h-6 w-6 rounded-lg shadow-sm',
        text: 'text-2xs',
        link: 'before:rounded-lg',
        container: '',
        linkIcon: 'w-3.5 h-3.5',
      },
      default: {
        base: '',
        icon: 'h-6 w-6 rounded-lg shadow-sm ',
        text: '',
        link: 'before:rounded-lg m-0.5',
        container: 'p-px',
        linkIcon: 'w-4 h-4',
      },
      icon: {
        base: '',
        icon: 'h-6 w-6 rounded-lg shadow-sm  mr-0',
        text: 'w-0 text-2xs',
        link: 'before:rounded-lg m-0.5 -inset-px absolute rounded-lg',
        container: 'p-px',
        linkIcon: 'w-0 h-0',
      },
    },
  },
  defaultVariants: {
    size: 'default',
  },
});

export function getSearchParams(
  search: string,
  excludingInvocationId?: string
) {
  const searchParams = new URLSearchParams(search);
  Array.from(searchParams.keys()).forEach((key) => {
    if (
      ![
        SERVICE_PLAYGROUND_QUERY_PARAM,
        SERVICE_QUERY_PARAM,
        DEPLOYMENT_QUERY_PARAM,
        INVOCATION_QUERY_NAME,
        'state', // TODO resolve circular dependency
        // STATE_QUERY_NAME,
      ].includes(key)
    ) {
      searchParams.delete(key);
    }
    if (key === INVOCATION_QUERY_NAME && excludingInvocationId) {
      searchParams.delete(key, excludingInvocationId);
    }
  });
  return '?' + searchParams.toString();
}
export function InvocationId({
  id,
  className,
  size = 'default',
}: {
  id: Invocation['id'];
  className?: string;
  size?: 'sm' | 'default' | 'icon' | 'md';
}) {
  const linkRef = useRef<HTMLAnchorElement>(null);
  const { base, icon, text, link, container, linkIcon } = styles({ size });
  const invocationInSidebar = useActiveSidebarParam(INVOCATION_QUERY_NAME);
  const isSelected = invocationInSidebar === id;

  const { baseUrl } = useRestateContext();
  const isIcon = size === 'icon';
  const location = useLocation();

  const isInInvocationsPage = useIsInInvocationPage();
  const [isMetaKeyPressed, setIsMetaKeyPressed] = useState(false);
  const openInSidebar = Boolean(isInInvocationsPage) && !isMetaKeyPressed;

  useEffect(() => {
    const keyDownHandler = (e: KeyboardEvent) => {
      if (e.key === 'Meta' || e.key === 'Shift') {
        setIsMetaKeyPressed(true);
      }
    };
    const keyUpHandler = (e: KeyboardEvent) => {
      if (e.key === 'Meta' || e.key === 'Shift') {
        setIsMetaKeyPressed(false);
      }
    };
    window.addEventListener('keydown', keyDownHandler);
    window.addEventListener('keyup', keyUpHandler);

    return () => {
      window.removeEventListener('keydown', keyDownHandler);
      window.removeEventListener('keyup', keyUpHandler);
    };
  }, []);

  const linkElement = (
    <Link
      ref={linkRef}
      {...(openInSidebar && {
        href: `?${INVOCATION_QUERY_NAME}=${id}`,
      })}
      {...(!openInSidebar && {
        href: `${baseUrl}/invocations/${id}${getSearchParams(location.search)}`,
      })}
      aria-label={id}
      variant="secondary"
      className={link()}
      data-invocation-selected={isSelected}
    >
      <Icon name={IconName.ChevronRight} className={linkIcon()} />
    </Link>
  );

  return (
    <div className={base({ className })}>
      <div className={container({})}>
        <div className={icon()}>
          <Icon
            name={IconName.Invocation}
            className="w-full h-full text-zinc-500 p-1"
          />
        </div>

        {!isIcon && (
          <TruncateWithTooltip copyText={id} triggerRef={linkRef}>
            <span className={text()}>{id}</span>
          </TruncateWithTooltip>
        )}

        {isIcon ? (
          <HoverTooltip content={id} offset={20}>
            {linkElement}
          </HoverTooltip>
        ) : (
          linkElement
        )}
      </div>
    </div>
  );
}
