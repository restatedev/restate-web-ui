import { ReactNode, useMemo } from 'react';
import { useLocation } from 'react-router';
import { Icon, IconName } from '@restate/ui-icons';
import { tv } from '@restate/util-styles';
import { Link } from '@restate/ui-link';
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownPopover,
  DropdownTrigger,
} from '@restate/ui-dropdown';
import { Button } from '@restate/ui-button';
import { HoverTooltip } from '@restate/ui-tooltip';
import { useNavExpansion, useSidebar } from './Sidebar';

export interface SidebarLocation {
  pathname: string;
  searchParams: URLSearchParams;
}

export type SidebarMatch = (loc: SidebarLocation) => boolean;

export type SidebarSubItemAction =
  | {
      href: string;
      ariaLabel: string;
      icon: IconName;
      preserveSearchParams?: boolean | string[];
    }
  | {
      render: (props: { className: string }) => ReactNode;
    };

export interface SidebarSubItem {
  href: string;
  label: ReactNode;
  match?: SidebarMatch;
  preserveSearchParams?: boolean | string[];
  disabled?: boolean;
  action?: SidebarSubItemAction;
}

export interface SidebarNavItemProps {
  href: string;
  icon: IconName;
  label: ReactNode;
  match?: SidebarMatch;
  preserveSearchParams?: boolean | string[];
  subItems?: SidebarSubItem[];
  extraSubItems?: SidebarSubItem[];
  visibleSubCount?: number;
  defaultExpanded?: boolean;
  autoExpandSubItems?: boolean;
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

// All collapsed/expanded styling below keys off the sidebar's OWN state
// (`group-data-[collapsed]/sidebar`) — never the screen width. A sidebar the
// user expands on a narrow viewport must still show its labels and sub-links,
// so do NOT reintroduce viewport variants (`max-xl:`/`md:`/`xl:`) here: gate
// visuals on the sidebar, not the window. See `data-collapsed` in Sidebar.tsx.
const navStyles = tv({
  slots: {
    row: 'group/nav-item relative isolate flex flex-col',
    link: 'flex w-full min-w-0 items-center gap-2 rounded-xl border border-transparent p-0.5 text-sm no-underline outline-offset-2 outline-focus transition-all duration-300 group-data-[collapsed=false]/sidebar:w-full group-data-[collapsed=false]/sidebar:translate-x-0 group-data-[collapsed=false]/sidebar:gap-2 group-data-[collapsed=true]/sidebar:w-fit group-data-[collapsed=true]/sidebar:translate-x-[5px] group-data-[collapsed=true]/sidebar:gap-0 focus-visible:outline-2',
    iconWrap:
      'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-transparent',
    icon: 'h-4.5 w-4.5 shrink-0 text-current',
    label:
      'max-w-full min-w-0 flex-auto truncate overflow-hidden pr-1 text-left opacity-100 transition-[max-width,opacity,padding] duration-300 group-data-[collapsed=false]/sidebar:max-w-full group-data-[collapsed=false]/sidebar:pr-1 group-data-[collapsed=false]/sidebar:opacity-100 group-data-[collapsed=true]/sidebar:max-w-0 group-data-[collapsed=true]/sidebar:pr-0 group-data-[collapsed=true]/sidebar:opacity-0',
    subWrap:
      'relative ml-[1.0625rem] flex flex-col gap-0 overflow-hidden border-l border-tint-subtle pl-2 transition-[max-height,opacity,margin-top] duration-300 group-data-[collapsed=true]/sidebar:mt-0! group-data-[collapsed=true]/sidebar:max-h-0! group-data-[collapsed=true]/sidebar:opacity-0!',
    subRow: 'flex items-center pr-1 pl-1 first:pt-1 last:pb-1',
    subLink:
      'flex min-w-0 flex-auto items-center rounded-lg px-2.5 py-1 text-0.5xs no-underline outline-offset-2 outline-focus transition focus-visible:outline-2',
    subAction:
      'ml-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-muted no-underline outline-offset-2 outline-focus transition hover:bg-tint hover:text-secondary focus-visible:outline-2',
    subActionSpacer: 'ml-1 h-5 w-5 shrink-0',
    subActionIcon: 'h-3.5 w-3.5 shrink-0',
    overflowTrigger:
      'flex w-full items-center gap-2 rounded-lg border-none bg-transparent px-2.5 py-1 text-left text-0.5xs shadow-none hover:bg-tint-subtle',
    rowLine: 'flex items-center',
    chevron:
      'mr-0.5 h-6 w-6 shrink-0 rounded-md text-subtle transition group-data-[collapsed=true]/sidebar:hidden hover:text-tertiary',
    chevronIcon: 'h-3.5 w-3.5 shrink-0 transition-transform duration-200',
  },
  variants: {
    isActive: {
      true: {
        link: 'border-tint-subtle bg-subtle text-accent shadow-xs hover:bg-muted pressed:bg-emphasis',
        icon: 'text-accent',
        iconWrap: 'bg-transparent',
      },
      false: {
        link: 'text-secondary hover:bg-tint-subtle pressed:bg-emphasis',
        icon: 'text-subtle group-hover/nav-item:text-muted',
        iconWrap: 'border-transparent bg-transparent shadow-none',
      },
    },
    isSubActive: {
      true: {
        subLink:
          'bg-subtle font-medium text-accent shadow-xs ring-1 ring-tint-subtle hover:bg-muted pressed:bg-emphasis',
      },
      false: {
        subLink:
          'text-muted hover:bg-tint-subtle hover:text-secondary pressed:bg-emphasis',
      },
    },
    isOverflowActive: {
      true: {
        overflowTrigger:
          'bg-subtle font-medium text-accent shadow-xs ring-1 ring-tint-subtle',
      },
      false: { overflowTrigger: 'text-muted hover:text-secondary' },
    },
    isExpanded: {
      true: {
        subWrap: '-mt-1.5 max-h-96 opacity-100',
        chevronIcon: 'rotate-90',
      },
      false: { subWrap: 'max-h-0 opacity-0' },
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
  extraSubItems,
  visibleSubCount = DEFAULT_VISIBLE_SUB_COUNT,
  defaultExpanded = false,
  autoExpandSubItems = true,
  disabled,
}: SidebarNavItemProps) {
  const { isCollapsed, closeDrawer } = useSidebar();
  const navExpansion = useNavExpansion();
  const location = useSidebarLocation();
  const ownActive = !disabled && (match ?? defaultMatcher(href))(location);

  const activeChildIdx = (subItems ?? []).findIndex((sub) =>
    (sub.match ?? defaultMatcher(sub.href))(location),
  );
  const anyChildActive = activeChildIdx >= 0;
  const anyExtraActive = (extraSubItems ?? []).some((sub) =>
    (sub.match ?? defaultMatcher(sub.href))(location),
  );

  const hasSubContent =
    (subItems?.length ?? 0) > 0 || (extraSubItems?.length ?? 0) > 0;
  const sectionId = href.split('?')[0] || href;
  const expanded = hasSubContent
    ? navExpansion.isOpen(
        sectionId,
        defaultExpanded || anyChildActive || anyExtraActive,
        autoExpandSubItems,
      )
    : true;
  const sectionClosed = hasSubContent && !expanded;
  const effectiveActive =
    isCollapsed || sectionClosed
      ? ownActive
      : ownActive && !anyChildActive && !anyExtraActive;

  const hasAnyAction =
    (subItems ?? []).some((sub) => sub.action) ||
    (extraSubItems ?? []).some((sub) => sub.action);

  // First `visibleSubCount` items stay fixed in the rail; the rest live in
  // the More overflow. Active overflow items are surfaced via the More
  // dropdown's active styling and indicator dot, not by promotion.
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
    return {
      visible: subItems.slice(0, visibleSubCount),
      overflow: subItems.slice(visibleSubCount),
    };
  }, [subItems, visibleSubCount]);

  const s = navStyles({
    isActive: effectiveActive,
    isDisabled: disabled,
    isExpanded: expanded,
  });

  return (
    <li className={s.row()}>
      <div className={s.rowLine()}>
        <HoverTooltip
          content={label}
          placement="right"
          disabled={!isCollapsed || disabled}
          offset={12}
          className="min-w-0 flex-auto"
        >
          <Link
            href={href}
            preserveQueryParams={preserveSearchParams}
            disabled={disabled}
            className={s.link()}
            aria-current={effectiveActive ? 'page' : undefined}
            onClick={closeDrawer}
          >
            <span className={s.iconWrap()}>
              <Icon name={icon} className={s.icon()} aria-hidden />
            </span>
            <span className={s.label()}>{label}</span>
          </Link>
        </HoverTooltip>
        {hasSubContent && !disabled && (
          <Button
            variant="icon"
            type="button"
            onClick={() => navExpansion.toggle(sectionId, expanded)}
            className={s.chevron()}
            aria-label={expanded ? 'Collapse section' : 'Expand section'}
            aria-expanded={expanded}
          >
            <Icon
              name={IconName.ChevronRight}
              className={s.chevronIcon()}
              aria-hidden
            />
          </Button>
        )}
      </div>
      {hasSubContent && (
        <div className={s.subWrap()} data-nav-sublist>
          {partition.visible.map((item) => (
            <SidebarSubLink
              key={item.href}
              item={item}
              location={location}
              parentDisabled={disabled}
              reserveActionSpace={hasAnyAction}
            />
          ))}
          {extraSubItems?.map((item) => (
            <SidebarSubLink
              key={item.href}
              item={item}
              location={location}
              parentDisabled={disabled}
              reserveActionSpace={hasAnyAction}
            />
          ))}
          {partition.overflow.length > 0 && (
            <SidebarOverflow items={partition.overflow} />
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
  reserveActionSpace,
}: {
  item: SidebarSubItem;
  location: SidebarLocation;
  parentDisabled?: boolean;
  reserveActionSpace?: boolean;
}) {
  const disabled = parentDisabled || item.disabled;
  const isActive =
    !disabled && (item.match ?? defaultMatcher(item.href))(location);
  const s = navStyles({ isSubActive: isActive, isDisabled: disabled });
  const { closeDrawer } = useSidebar();
  return (
    <div className={s.subRow()}>
      <Link
        href={item.href}
        preserveQueryParams={item.preserveSearchParams ?? false}
        disabled={disabled}
        className={s.subLink()}
        aria-current={isActive ? 'page' : undefined}
        onClick={closeDrawer}
      >
        {item.label}
      </Link>
      {item.action ? (
        'render' in item.action ? (
          item.action.render({ className: s.subAction() })
        ) : (
          <HoverTooltip
            content={item.action.ariaLabel}
            placement="top"
            disabled={disabled}
          >
            <Link
              href={item.action.href}
              preserveQueryParams={item.action.preserveSearchParams ?? false}
              disabled={disabled}
              className={s.subAction()}
              aria-label={item.action.ariaLabel}
            >
              <Icon
                name={item.action.icon}
                className={s.subActionIcon()}
                aria-hidden
              />
            </Link>
          </HoverTooltip>
        )
      ) : reserveActionSpace ? (
        <div className={s.subActionSpacer()} aria-hidden />
      ) : null}
    </div>
  );
}

function SidebarOverflow({ items }: { items: SidebarSubItem[] }) {
  const s = navStyles({ isOverflowActive: false });
  const { closeDrawer } = useSidebar();
  return (
    <Dropdown>
      <DropdownTrigger>
        <Button variant="secondary" className={s.overflowTrigger()}>
          <Icon
            name={IconName.Ellipsis}
            className="h-4 w-4 shrink-0 text-subtle"
            aria-hidden
          />
          <span className="min-w-0 flex-auto truncate">More</span>
        </Button>
      </DropdownTrigger>
      <DropdownPopover>
        <DropdownMenu onSelect={closeDrawer}>
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
