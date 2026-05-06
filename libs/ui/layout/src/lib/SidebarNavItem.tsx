import { ReactNode, useMemo } from 'react';
import { useLocation } from 'react-router';
import { Icon, IconName } from '@restate/ui/icons';
import { tv } from '@restate/util/styles';
import { Link } from '@restate/ui/link';
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownPopover,
  DropdownTrigger,
} from '@restate/ui/dropdown';
import { Button } from '@restate/ui/button';
import { HoverTooltip } from '@restate/ui/tooltip';
import { useSidebar } from './Sidebar';

export interface SidebarLocation {
  pathname: string;
  searchParams: URLSearchParams;
}

export type SidebarMatch = (loc: SidebarLocation) => boolean;

export interface SidebarSubItem {
  href: string;
  label: ReactNode;
  match?: SidebarMatch;
  preserveSearchParams?: boolean | string[];
  disabled?: boolean;
}

export interface SidebarNavOverflowDynamic {
  match: SidebarMatch;
  label: (loc: SidebarLocation) => ReactNode;
}

export interface SidebarNavItemProps {
  href: string;
  icon: IconName;
  label: ReactNode;
  match?: SidebarMatch;
  preserveSearchParams?: boolean | string[];
  subItems?: SidebarSubItem[];
  visibleSubCount?: number;
  overflowDynamic?: SidebarNavOverflowDynamic;
  disabled?: boolean;
}

const DEFAULT_VISIBLE_SUB_COUNT = 4;

function defaultMatcher(href: string): SidebarMatch {
  const pathOnly = href.split('?')[0] ?? href;
  return (l) => Boolean(pathOnly) && l.pathname.startsWith(pathOnly);
}

function useSidebarLocation(): SidebarLocation {
  const loc = useLocation();
  return {
    pathname: loc.pathname,
    searchParams: new URLSearchParams(loc.search),
  };
}

const navStyles = tv({
  slots: {
    row: 'group/nav-item relative isolate flex flex-col gap-0.5',
    link: 'flex w-full items-center gap-2 rounded-xl border border-transparent p-0.5 text-sm no-underline outline-offset-2 outline-blue-600 transition focus-visible:outline-2 @max-[8rem]/sidebar:mx-auto @max-[8rem]/sidebar:w-fit @max-[8rem]/sidebar:justify-center @max-[8rem]/sidebar:p-0',
    iconWrap:
      'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-transparent',
    icon: 'h-4.5 w-4.5 shrink-0 text-current',
    label:
      'min-w-0 flex-auto truncate pr-1 text-left @max-[8rem]/sidebar:hidden',
    subWrap:
      'relative ml-[1.0625rem] flex flex-col gap-0 border-l border-zinc-800/10 pl-2 @max-[8rem]/sidebar:hidden',
    subRow: 'flex items-center',
    subLink:
      'flex min-w-0 flex-auto items-center rounded-lg px-2.5 py-1 text-0.5xs no-underline outline-offset-2 outline-blue-600 transition focus-visible:outline-2',
    overflowTrigger:
      'flex w-full items-center gap-2 rounded-lg border-none bg-transparent px-2.5 py-1 text-left text-0.5xs shadow-none hover:bg-black/3',
  },
  variants: {
    isActive: {
      true: {
        link: 'border-black/5 bg-gray-50 text-blue-600 shadow-xs hover:bg-gray-100 pressed:bg-gray-200',
        icon: 'text-blue-600',
        iconWrap: 'bg-transparent',
      },
      false: {
        link: 'text-gray-600 hover:bg-black/3 pressed:bg-gray-200',
        icon: 'text-zinc-400 group-hover/nav-item:text-zinc-500',
        iconWrap: 'border-transparent bg-transparent shadow-none',
      },
    },
    isSubActive: {
      true: {
        subLink:
          'bg-gray-50 font-medium text-gray-800 shadow-xs ring-1 ring-black/5 hover:bg-gray-100 pressed:bg-gray-200',
      },
      false: {
        subLink:
          'text-gray-500 hover:bg-black/3 hover:text-gray-700 pressed:bg-gray-200',
      },
    },
    isOverflowActive: {
      true: {
        overflowTrigger:
          'bg-gray-50 font-medium text-gray-800 shadow-xs ring-1 ring-black/5',
      },
      false: { overflowTrigger: 'text-gray-500 hover:text-gray-700' },
    },
    isDisabled: {
      true: {
        link: 'pointer-events-none opacity-50',
        subLink: 'pointer-events-none opacity-50',
      },
      false: {},
    },
  },
});

export function SidebarNavItem({
  href,
  icon,
  label,
  match,
  preserveSearchParams = true,
  subItems,
  visibleSubCount = DEFAULT_VISIBLE_SUB_COUNT,
  overflowDynamic,
  disabled,
}: SidebarNavItemProps) {
  const { isCollapsed } = useSidebar();
  const location = useSidebarLocation();
  const ownActive = !disabled && (match ?? defaultMatcher(href))(location);

  const activeChildIdx = (subItems ?? []).findIndex((sub) =>
    (sub.match ?? defaultMatcher(sub.href))(location),
  );
  const anyChildActive = activeChildIdx >= 0;
  const overflowDynamicActive = overflowDynamic?.match(location) ?? false;
  const overflowDynamicLabel =
    overflowDynamicActive && overflowDynamic
      ? overflowDynamic.label(location)
      : null;
  const effectiveActive = isCollapsed
    ? ownActive
    : ownActive && !anyChildActive && !overflowDynamicActive;

  const partition = useMemo(() => {
    if (!subItems || subItems.length === 0) {
      return {
        visible: [] as SidebarSubItem[],
        overflow: [] as SidebarSubItem[],
      };
    }
    if (subItems.length <= visibleSubCount) {
      return { visible: subItems, overflow: [] as SidebarSubItem[] };
    }
    const visible = subItems.slice(0, visibleSubCount);
    const overflow = subItems.slice(visibleSubCount);
    if (activeChildIdx >= visibleSubCount) {
      const activeItem = subItems[activeChildIdx];
      const replaceIdx = visible.length - 1;
      const displaced = visible[replaceIdx];
      const overflowIdx = activeChildIdx - visibleSubCount;
      if (activeItem && displaced) {
        const newVisible = visible.slice();
        newVisible[replaceIdx] = activeItem;
        const newOverflow = overflow.slice();
        newOverflow[overflowIdx] = displaced;
        return { visible: newVisible, overflow: newOverflow };
      }
    }
    return { visible, overflow };
  }, [subItems, visibleSubCount, activeChildIdx]);

  const s = navStyles({ isActive: effectiveActive, isDisabled: disabled });

  return (
    <li className={s.row()}>
      <HoverTooltip
        content={label}
        placement="right"
        disabled={!isCollapsed || disabled}
        offset={12}
      >
        <Link
          href={href}
          preserveQueryParams={preserveSearchParams}
          disabled={disabled}
          className={s.link()}
          aria-current={effectiveActive ? 'page' : undefined}
        >
          <span className={s.iconWrap()}>
            <Icon name={icon} className={s.icon()} aria-hidden />
          </span>
          <span className={s.label()}>{label}</span>
        </Link>
      </HoverTooltip>
      {subItems && subItems.length > 0 && (
        <div className={s.subWrap()}>
          {partition.visible.map((item) => (
            <SidebarSubLink
              key={item.href}
              item={item}
              location={location}
              parentDisabled={disabled}
            />
          ))}
          {(partition.overflow.length > 0 || overflowDynamicActive) && (
            <SidebarOverflow
              items={partition.overflow}
              location={location}
              dynamicLabel={overflowDynamicLabel}
              isDynamicActive={overflowDynamicActive}
            />
          )}
        </div>
      )}
    </li>
  );
}

function SidebarSubLink({
  item,
  location,
  parentDisabled,
}: {
  item: SidebarSubItem;
  location: SidebarLocation;
  parentDisabled?: boolean;
}) {
  const disabled = parentDisabled || item.disabled;
  const isActive =
    !disabled && (item.match ?? defaultMatcher(item.href))(location);
  const s = navStyles({ isSubActive: isActive, isDisabled: disabled });
  return (
    <div className={s.subRow()}>
      <Link
        href={item.href}
        preserveQueryParams={item.preserveSearchParams ?? false}
        disabled={disabled}
        className={s.subLink()}
        aria-current={isActive ? 'page' : undefined}
      >
        {item.label}
      </Link>
    </div>
  );
}

function SidebarOverflow({
  items,
  location,
  dynamicLabel,
  isDynamicActive,
}: {
  items: SidebarSubItem[];
  location: SidebarLocation;
  dynamicLabel?: ReactNode;
  isDynamicActive?: boolean;
}) {
  const s = navStyles({ isOverflowActive: isDynamicActive });
  const hasActive =
    !isDynamicActive &&
    items.some((item) => (item.match ?? defaultMatcher(item.href))(location));
  return (
    <Dropdown>
      <DropdownTrigger>
        <Button variant="secondary" className={s.overflowTrigger()}>
          <Icon
            name={IconName.Ellipsis}
            className="h-4 w-4 shrink-0 text-gray-400"
            aria-hidden
          />
          <span className="min-w-0 flex-auto truncate">
            {isDynamicActive && dynamicLabel ? dynamicLabel : 'More'}
          </span>
          {hasActive && (
            <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
          )}
        </Button>
      </DropdownTrigger>
      <DropdownPopover>
        <DropdownMenu>
          {items.map((item) => (
            <DropdownItem key={item.href} href={item.href} value={item.href}>
              {item.label}
            </DropdownItem>
          ))}
        </DropdownMenu>
      </DropdownPopover>
    </Dropdown>
  );
}
