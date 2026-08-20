import { Fragment } from 'react';
import { Button } from '@restate/ui/button';
import { Chip, ChipSegment } from '@restate/ui/chip';
import {
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownPopover,
  DropdownTrigger,
} from '@restate/ui/dropdown';
import { Icon, IconName } from '@restate/ui/icons';
import { Link } from '@restate/ui/link';
import {
  Popover,
  PopoverContent,
  PopoverHoverTrigger,
} from '@restate/ui/popover';
import { tv } from '@restate/util/styles';
import { useBreadcrumbPages, useBreadcrumbs } from './BreadcrumbsProvider';
import type { BreadcrumbComponentProps, TrailCrumb } from './types';

export type BreadcrumbsVariant = 'chips' | 'flat';

const styles = tv({
  slots: {
    nav: 'flex max-w-full min-w-0 flex-wrap items-center gap-y-1',
    chip: 'max-w-44 bg-gray-50 text-xs font-normal text-zinc-600',
    current:
      'flex max-w-full min-w-0 items-center gap-0.5 pl-1 text-xs font-normal text-zinc-500 [&_[data-crumb-label]]:overflow-visible [&_[data-crumb-label]]:break-all [&_[data-crumb-label]]:whitespace-normal',
    icon: 'h-3 w-3 shrink-0 text-zinc-400',
    label: 'min-w-0 truncate',
    ellipsisButton: 'h-full rounded-none px-1 py-0 text-zinc-500',
    menuItem: 'flex max-w-60 min-w-0 items-center gap-1 text-xs font-normal',
    flatItem:
      'relative isolate flex min-w-0 items-center gap-x-0.5 px-1.5 pt-px pb-[6px] before:absolute before:inset-0 before:-z-10 before:bg-zinc-500/8 has-[[data-hovered]]:before:bg-zinc-500/13 has-[[data-pressed]]:before:bg-zinc-500/18',
    flatLink:
      'flex min-w-0 items-center gap-1 rounded px-0.5 font-normal text-zinc-600 no-underline hover:text-zinc-800',
    flatCurrent: 'flex min-w-0 items-center',
    flatCurrentChip:
      '[--chip-height:1.6875rem] [--chip-radius:0.375rem] [--chip-slope:6px]',
    flatCurrentChipRoot: 'bg-gray-100 text-2xs font-normal text-zinc-500',
    flatCurrentChipSegment: 'pr-1.5 pl-2.5',
    flatEllipsisButton: 'rounded p-0.5 text-zinc-600 hover:text-zinc-800',
  },
  variants: {
    variant: {
      chips: {
        nav: 'ml-2 gap-x-0 [--chip-shadow:0_1px_2px_rgb(0_0_0/0.05)]',
      },
      flat: {
        nav: 'flex-nowrap gap-x-0 text-2xs leading-none [&_[data-crumb-label]+button]:h-3.5 [&_[data-crumb-label]+button]:w-3.5 [&_[data-crumb-label]+button]:p-[3px] [&>*+*]:-ml-px',
      },
    },
    seg: {
      first: {
        flatItem:
          'pr-2.5 before:rounded-l-md before:[clip-path:polygon(0_0,100%_0,calc(100%-6px)_100%,0_100%)]',
      },
      mid: {
        flatItem:
          'px-2.5 before:[clip-path:polygon(6px_0,100%_0,calc(100%-6px)_100%,0_100%)]',
      },
      last: {
        flatItem: 'p-0 before:hidden',
      },
    },
    hiddenOnMobile: {
      true: {
        chip: 'max-md:hidden',
        flatItem: 'max-md:hidden',
      },
      false: {},
    },
    isList: {
      true: {
        chip: 'pl-1',
      },
      false: {},
    },
  },
  defaultVariants: {
    variant: 'chips',
    seg: 'mid',
    hiddenOnMobile: false,
    isList: false,
  },
});

const chipStyles = tv({
  base: 'px-2',
  variants: {
    isList: {
      true: 'pl-1',
      false: '',
    },
  },
});

export function CrumbContent({ crumb }: BreadcrumbComponentProps) {
  const { icon, label } = styles();
  return (
    <>
      <Icon
        name={crumb.kind === 'list' ? IconName.ArrowLeft : crumb.icon}
        className={icon()}
      />
      <span data-crumb-label className={label()}>
        {crumb.label}
      </span>
    </>
  );
}

function CollapsedCrumbs({
  crumbs,
  flat,
  className,
}: {
  crumbs: TrailCrumb[];
  flat?: boolean;
  className?: string;
}) {
  const {
    chip,
    ellipsisButton,
    menuItem,
    icon,
    label,
    flatItem,
    flatEllipsisButton,
  } = styles();
  const menu = (
    <DropdownPopover>
      <DropdownMenu>
        {crumbs.map((crumb) => (
          <DropdownItem key={crumb.pathname} href={crumb.href}>
            <span className={menuItem()}>
              <Icon name={crumb.icon} className={icon()} />
              <span className={label()}>{crumb.label}</span>
            </span>
          </DropdownItem>
        ))}
      </DropdownMenu>
    </DropdownPopover>
  );
  if (flat) {
    return (
      <span className={flatItem({ className })}>
        <Dropdown>
          <DropdownTrigger>
            <Button
              variant="icon"
              aria-label={`Show ${crumbs.length} more pages`}
              className={flatEllipsisButton()}
            >
              <Icon name={IconName.Ellipsis} className="h-3 w-3" />
            </Button>
          </DropdownTrigger>
          {menu}
        </Dropdown>
      </span>
    );
  }
  return (
    <Dropdown>
      <DropdownTrigger>
        <Chip
          left="angled"
          right="angled"
          size="sm"
          className={chip({ className })}
        >
          <ChipSegment className="p-0">
            <Button
              variant="icon"
              aria-label={`Show ${crumbs.length} more pages`}
              className={ellipsisButton()}
            >
              <Icon name={IconName.Ellipsis} className="h-3.5 w-3.5" />
            </Button>
          </ChipSegment>
        </Chip>
      </DropdownTrigger>
      {menu}
    </Dropdown>
  );
}

export function Breadcrumbs({
  variant = 'chips',
  className,
}: {
  variant?: BreadcrumbsVariant;
  className?: string;
}) {
  const crumbs = useBreadcrumbs();
  const pages = useBreadcrumbPages();
  if (crumbs.length < 2) {
    return null;
  }
  const {
    nav,
    chip,
    current,
    flatItem,
    flatLink,
    flatCurrent,
    flatCurrentChip,
    flatCurrentChipRoot,
    flatCurrentChipSegment,
  } = styles({ variant });
  const total = crumbs.length;
  const isFlat = variant === 'flat';
  const isMobileCollapsed = total >= 4;
  const isDesktopCollapsed = total >= 5;
  const mobileHidden = isMobileCollapsed ? crumbs.slice(1, total - 1) : [];
  const desktopHidden = isDesktopCollapsed ? crumbs.slice(2, total - 2) : [];

  return (
    <nav aria-label="Breadcrumb" className={nav({ className })}>
      {crumbs.map((crumb, index) => {
        const isCollapsedOnDesktop =
          isDesktopCollapsed && index >= 2 && index <= total - 3;
        const isEdge = index === 0 || index === total - 1;

        const page = pages.find(
          (pageDefinition) => pageDefinition.pattern === crumb.pattern,
        );
        const Content = page?.Content ?? CrumbContent;
        const PopoverComponent = page?.Popover;

        const collapsedInserts = (
          <>
            {index === 1 && isMobileCollapsed && (
              <CollapsedCrumbs
                crumbs={mobileHidden}
                flat={isFlat}
                className="md:hidden"
              />
            )}
            {index === 2 && isDesktopCollapsed && (
              <CollapsedCrumbs
                crumbs={desktopHidden}
                flat={isFlat}
                className="max-md:hidden"
              />
            )}
          </>
        );

        if (isFlat) {
          const interactiveElement = crumb.isCurrent ? (
            <span aria-current="page" className={flatCurrent()}>
              <Chip
                left="angled"
                right="straight"
                size="sm"
                containerClassName={flatCurrentChip()}
                className={flatCurrentChipRoot()}
              >
                <ChipSegment className={flatCurrentChipSegment()}>
                  <Content crumb={crumb} />
                </ChipSegment>
              </Chip>
            </span>
          ) : (
            <Link
              href={crumb.href}
              variant="icon"
              aria-label={crumb.label}
              className={flatLink()}
            >
              <Content crumb={crumb} />
            </Link>
          );
          return (
            <Fragment key={crumb.pathname}>
              {collapsedInserts}
              {!isCollapsedOnDesktop && (
                <span
                  className={flatItem({
                    hiddenOnMobile: !isEdge && isMobileCollapsed,
                    seg:
                      index === 0 ? 'first' : crumb.isCurrent ? 'last' : 'mid',
                  })}
                >
                  {PopoverComponent && !crumb.isCurrent ? (
                    <Popover>
                      <PopoverHoverTrigger>
                        {interactiveElement}
                      </PopoverHoverTrigger>
                      <PopoverContent placement="bottom" isNonModal>
                        <PopoverComponent crumb={crumb} />
                      </PopoverContent>
                    </Popover>
                  ) : (
                    interactiveElement
                  )}
                </span>
              )}
            </Fragment>
          );
        }

        const crumbElement = isCollapsedOnDesktop ? null : crumb.isCurrent ? (
          <span aria-current="page" className={current()}>
            <Content crumb={crumb} />
          </span>
        ) : (
          <Chip
            left={index === 0 ? 'straight' : 'angled'}
            right="angled"
            size="sm"
            href={crumb.href}
            aria-label={crumb.label}
            className={chip({
              hiddenOnMobile: !isEdge && isMobileCollapsed,
              isList: crumb.kind === 'list',
            })}
          >
            <ChipSegment
              className={chipStyles({ isList: crumb.kind === 'list' })}
            >
              <Content crumb={crumb} />
            </ChipSegment>
          </Chip>
        );

        return (
          <Fragment key={crumb.pathname}>
            {collapsedInserts}
            {crumbElement &&
              (PopoverComponent && !crumb.isCurrent && !isCollapsedOnDesktop ? (
                <Popover>
                  <PopoverHoverTrigger>{crumbElement}</PopoverHoverTrigger>
                  <PopoverContent placement="bottom" isNonModal>
                    <PopoverComponent crumb={crumb} />
                  </PopoverContent>
                </Popover>
              ) : (
                crumbElement
              ))}
          </Fragment>
        );
      })}
    </nav>
  );
}
