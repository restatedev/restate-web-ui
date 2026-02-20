import { useEffect, useRef, useState } from 'react';
import { Icon, IconName } from '@restate/ui/icons';
import { HoverTooltip, TruncateWithTooltip } from '@restate/ui/tooltip';
import { Link } from '@restate/ui/link';
import { Invocation } from '@restate/data-access/admin-api-spec';
import { tv } from '@restate/util/styles';
import { INVOCATION_QUERY_NAME } from './constants';
import { useActiveSidebarParam } from '@restate/ui/layout';
import { useLocation } from 'react-router';
import { useRestateContext } from '@restate/features/restate-context';
import {
  HANDLER_QUERY_PARAM,
  SERVICE_PLAYGROUND_QUERY_PARAM,
  SERVICE_QUERY_PARAM,
} from '@restate/features/service';
import { useIsInInvocationPage } from './InvocationPageContext';
import { DEPLOYMENT_QUERY_PARAM } from '@restate/features/deployment';
import { ONBOARDING_QUERY_PARAM } from '@restate/util/feature-flag';

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

export function getSearchParams(
  search: string,
  excludingInvocationId?: string,
  isLive?: boolean,
) {
  const searchParams = new URLSearchParams(search);
  Array.from(searchParams.keys()).forEach((key) => {
    if (
      ![
        SERVICE_PLAYGROUND_QUERY_PARAM,
        SERVICE_QUERY_PARAM,
        DEPLOYMENT_QUERY_PARAM,
        INVOCATION_QUERY_NAME,
        ONBOARDING_QUERY_PARAM,
        HANDLER_QUERY_PARAM,
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
  isLive = false,
  truncateInMiddle = false,
}: {
  id: Invocation['id'];
  className?: string;
  size?: 'sm' | 'default' | 'icon' | 'md';
  isLive?: boolean;
  truncateInMiddle?: boolean;
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
        href: `${baseUrl}/invocations/${id}${getSearchParams(location.search, undefined, isLive)}`,
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
            className="h-full w-full p-1 text-zinc-500"
          />
        </div>

        {!isIcon && (
          <TruncateWithTooltip copyText={id} triggerRef={linkRef}>
            <span className={text()}>
              {truncateInMiddle ? (
                <span>
                  {id?.substring(0, 8)}…{id?.slice(-5)}
                </span>
              ) : (
                id
              )}
            </span>
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
